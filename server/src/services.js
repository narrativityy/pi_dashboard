const express = require('express');
const { execFile } = require('child_process');
const verifyPassword = require('./verify');
const router = express.Router();

function getManagedServices() {
  return (process.env.MANAGED_SERVICES || 'pi-dashboard,ssh')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function isAllowed(name) {
  return getManagedServices().includes(name);
}

function systemctl(args) {
  return new Promise((resolve, reject) => {
    execFile('systemctl', args, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout.trim());
    });
  });
}

function sudoSystemctl(args) {
  return new Promise((resolve, reject) => {
    execFile('sudo', ['systemctl', ...args], (err, stdout, stderr) => {
      if (err) reject(stderr || err.message);
      else resolve(stdout.trim());
    });
  });
}

function parseProperties(output) {
  return Object.fromEntries(
    output.split('\n').map((line) => {
      const eq = line.indexOf('=');
      return [line.slice(0, eq), line.slice(eq + 1)];
    })
  );
}

async function getServiceStatus(name) {
  try {
    const out = await systemctl([
      'show', name,
      '--property=ActiveState,SubState,Description,LoadState',
    ]);
    const props = parseProperties(out);
    return {
      name,
      description: props.Description || name,
      activeState: props.ActiveState || 'unknown',
      subState: props.SubState || 'unknown',
      loaded: props.LoadState === 'loaded',
    };
  } catch {
    return { name, description: name, activeState: 'unknown', subState: 'unknown', loaded: false };
  }
}

// GET /api/services
router.get('/', async (req, res) => {
  const names = getManagedServices();
  const results = await Promise.all(names.map(getServiceStatus));
  res.json(results);
});

// GET /api/services/:name/logs
router.get('/:name/logs', async (req, res) => {
  const { name } = req.params;
  if (!isAllowed(name)) {
    return res.status(403).json({ error: 'Service not in managed list' });
  }
  const lines = Math.min(parseInt(req.query.lines, 10) || 100, 500);
  try {
    const output = await new Promise((resolve, reject) => {
      execFile(
        'journalctl',
        ['-u', name, '-n', String(lines), '--no-pager', '--output=short-precise'],
        (err, stdout) => {
          if (err) reject(err);
          else resolve(stdout);
        }
      );
    });
    res.json({ logs: output.split('\n').filter(Boolean) });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/services/:name/:action
router.post('/:name/:action', async (req, res) => {
  const { name, action } = req.params;

  if (!isAllowed(name)) {
    return res.status(403).json({ error: 'Service not in managed list' });
  }

  if (!['start', 'stop', 'restart'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  // Stop requires password re-verification
  if (action === 'stop') {
    const { password } = req.body;
    if (!password) {
      return res.status(401).json({ error: 'Password required to stop a service' });
    }
    try {
      await verifyPassword(req.user.username, password);
    } catch {
      return res.status(401).json({ error: 'Incorrect password' });
    }
  }

  try {
    await sudoSystemctl([action, name]);
    const status = await getServiceStatus(name);
    res.json({ ok: true, service: status });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

module.exports = router;

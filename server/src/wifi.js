const express = require('express');
const { execFile } = require('child_process');
const router = express.Router();

function run(cmd, args, timeout = 15000) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout.trim());
    });
  });
}

function nmcli(...args) {
  return run('nmcli', args);
}

function sudoNmcli(...args) {
  return run('sudo', ['nmcli', ...args], 30000);
}

// Parse nmcli -t output (colons as separator, \: escaped within values)
function parseTerse(line) {
  const fields = [];
  let current = '';
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '\\' && i + 1 < line.length && line[i + 1] === ':') {
      current += ':';
      i++;
    } else if (line[i] === ':') {
      fields.push(current);
      current = '';
    } else {
      current += line[i];
    }
  }
  fields.push(current);
  return fields;
}

function signalBars(signal) {
  if (signal >= 75) return 4;
  if (signal >= 50) return 3;
  if (signal >= 25) return 2;
  return 1;
}

// GET /api/wifi/networks?rescan=true
router.get('/networks', async (req, res) => {
  try {
    const rescan = req.query.rescan === 'true' ? 'yes' : 'auto';
    const out = await nmcli(
      '-t', '-f', 'IN-USE,SSID,SIGNAL,SECURITY,BSSID',
      'device', 'wifi', 'list', '--rescan', rescan
    );

    const seen = new Set();
    const networks = out
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [inUse, ssid, signalStr, security] = parseTerse(line);
        if (!ssid) return null;
        const signal = parseInt(signalStr, 10) || 0;
        return {
          ssid,
          signal,
          bars: signalBars(signal),
          secured: security !== '--' && security !== '',
          security: security === '--' ? 'Open' : security,
          connected: inUse === '*',
        };
      })
      .filter(Boolean)
      .filter((n) => {
        if (seen.has(n.ssid)) return false;
        seen.add(n.ssid);
        return true;
      })
      .sort((a, b) => b.signal - a.signal);

    res.json(networks);
  } catch (err) {
    res.status(500).json({ error: String(err.message) });
  }
});

// GET /api/wifi/status
router.get('/status', async (req, res) => {
  try {
    const out = await nmcli(
      '-t', '-f', 'DEVICE,TYPE,STATE,CONNECTION',
      'device', 'status'
    );

    const wifi = out
      .split('\n')
      .map((line) => parseTerse(line))
      .find(([, type]) => type === 'wifi');

    if (!wifi) return res.json({ connected: false });

    const [device, , state, connection] = wifi;
    const connected = state === 'connected';

    let ip = null;
    if (connected) {
      try {
        const ipOut = await nmcli('-t', '-f', 'IP4.ADDRESS', 'device', 'show', device);
        const match = ipOut.match(/IP4\.ADDRESS\[1\]:([^/\n]+)/);
        if (match) ip = match[1].trim();
      } catch {
        // non-fatal
      }
    }

    res.json({ connected, device, state, ssid: connection || null, ip });
  } catch (err) {
    res.status(500).json({ error: String(err.message) });
  }
});

// POST /api/wifi/connect  { ssid, password? }
router.post('/connect', async (req, res) => {
  const { ssid, password } = req.body;
  if (!ssid) return res.status(400).json({ error: 'SSID required' });

  try {
    // Try bringing up a saved connection first
    try {
      await sudoNmcli('connection', 'up', ssid);
      return res.json({ ok: true });
    } catch {
      // Not a saved connection — fall through to wifi connect
    }

    const args = ['device', 'wifi', 'connect', ssid];
    if (password) args.push('password', password);
    await sudoNmcli(...args);
    res.json({ ok: true });
  } catch (err) {
    const msg = String(err.message);
    if (msg.includes('Secrets were required') || msg.includes('password')) {
      return res.status(400).json({ error: 'Incorrect WiFi password' });
    }
    if (msg.includes('not found')) {
      return res.status(404).json({ error: 'Network not found' });
    }
    res.status(500).json({ error: msg });
  }
});

// POST /api/wifi/disconnect
router.post('/disconnect', async (req, res) => {
  try {
    const out = await nmcli('-t', '-f', 'DEVICE,TYPE', 'device', 'status');
    const wifi = out
      .split('\n')
      .map((l) => parseTerse(l))
      .find(([, type]) => type === 'wifi');

    if (!wifi) return res.status(404).json({ error: 'No WiFi device found' });
    await sudoNmcli('device', 'disconnect', wifi[0]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err.message) });
  }
});

module.exports = router;

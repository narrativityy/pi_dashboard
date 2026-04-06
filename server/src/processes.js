const express = require('express');
const si = require('systeminformation');
const verifyPassword = require('./verify');
const router = express.Router();

// GET /api/processes
router.get('/', async (req, res) => {
  try {
    const data = await si.processes();
    const top = data.list
      .sort((a, b) => b.cpu - a.cpu)
      .slice(0, 30)
      .map(({ pid, name, user, cpu, mem, command }) => ({
        pid,
        name,
        user,
        cpu: Math.round(cpu * 10) / 10,
        mem: Math.round(mem * 10) / 10,
        command,
      }));
    res.json(top);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/processes/:pid/kill
router.post('/:pid/kill', async (req, res) => {
  const pid = parseInt(req.params.pid, 10);
  if (!Number.isInteger(pid) || pid <= 0) {
    return res.status(400).json({ error: 'Invalid PID' });
  }
  if (pid === process.pid) {
    return res.status(400).json({ error: 'Cannot kill the dashboard process' });
  }

  const { password } = req.body;
  if (!password) return res.status(401).json({ error: 'Password required' });
  try {
    await verifyPassword(req.user.username, password);
  } catch {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  try {
    process.kill(pid, 'SIGTERM');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

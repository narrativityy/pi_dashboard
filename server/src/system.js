const express = require('express');
const { execFile } = require('child_process');
const si = require('systeminformation');
const verifyPassword = require('./verify');
const router = express.Router();

// GET /api/system/info
router.get('/info', async (req, res) => {
  try {
    const [os, cpu, mem, time] = await Promise.all([
      si.osInfo(),
      si.cpu(),
      si.mem(),
      si.time(),
    ]);
    res.json({
      hostname: os.hostname,
      distro: os.distro,
      release: os.release,
      kernel: os.kernel,
      arch: os.arch,
      cpuBrand: cpu.brand,
      cpuCores: cpu.cores,
      cpuSpeed: cpu.speed,
      totalMem: mem.total,
      uptime: time.uptime,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/system/reboot
router.post('/reboot', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(401).json({ error: 'Password required' });
  try {
    await verifyPassword(req.user.username, password);
  } catch {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  res.json({ ok: true });
  execFile('sudo', ['reboot']);
});

// POST /api/system/shutdown
router.post('/shutdown', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(401).json({ error: 'Password required' });
  try {
    await verifyPassword(req.user.username, password);
  } catch {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  res.json({ ok: true });
  execFile('sudo', ['shutdown', '-h', 'now']);
});

module.exports = router;

const express = require('express');
const si = require('systeminformation');
const { getHistory } = require('./db');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [cpu, cpuTemp, mem, disk, time, load] = await Promise.all([
      si.cpu(),
      si.cpuTemperature(),
      si.mem(),
      si.fsSize(),
      si.time(),
      si.currentLoad(),
    ]);

    const mainDisk = disk.find((d) => d.mount === '/') || disk[0];

    res.json({
      cpu: {
        manufacturer: cpu.manufacturer,
        brand: cpu.brand,
        speed: cpu.speed,
        cores: cpu.cores,
        load: Math.round(load.currentLoad),
      },
      temperature: {
        main: cpuTemp.main ?? null,
        cores: cpuTemp.cores ?? [],
      },
      memory: {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        percent: Math.round((mem.used / mem.total) * 100),
      },
      disk: mainDisk
        ? {
            fs: mainDisk.fs,
            mount: mainDisk.mount,
            size: mainDisk.size,
            used: mainDisk.used,
            percent: Math.round(mainDisk.use),
          }
        : null,
      uptime: time.uptime,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read system stats' });
  }
});

router.get('/history', (req, res) => {
  const hours = Math.min(parseInt(req.query.hours) || 24, 24);
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  const rows = getHistory.all({ cutoff });
  res.json(rows);
});

module.exports = router;

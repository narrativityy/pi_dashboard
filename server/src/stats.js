const express = require('express');
const si = require('systeminformation');
const { getHistory } = require('./db');
const router = express.Router();

async function getLiveStats() {
  const [cpu, cpuTemp, mem, disk, time, load, ifaces, netStats, osInfo] = await Promise.all([
    si.cpu(),
    si.cpuTemperature(),
    si.mem(),
    si.fsSize(),
    si.time(),
    si.currentLoad(),
    si.networkInterfaces(),
    si.networkStats(),
    si.osInfo(),
  ]);

  const mainDisk = disk.find((d) => d.mount === '/') || disk[0];
  const primaryIface = (Array.isArray(ifaces) ? ifaces : [ifaces])
    .find((i) => i.default && !i.internal) ||
    (Array.isArray(ifaces) ? ifaces : [ifaces]).find((i) => !i.internal);
  const primaryStats = netStats.find((s) => s.iface === primaryIface?.iface) || netStats[0];

  return {
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
    network: primaryIface
      ? {
          hostname: osInfo.hostname,
          iface: primaryIface.iface,
          ip: primaryIface.ip4,
          type: primaryIface.type,
          rx_bytes: primaryStats?.rx_bytes ?? 0,
          tx_bytes: primaryStats?.tx_bytes ?? 0,
        }
      : null,
    uptime: time.uptime,
  };
}

router.get('/', async (req, res) => {
  try {
    res.json(await getLiveStats());
  } catch {
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
module.exports.getLiveStats = getLiveStats;

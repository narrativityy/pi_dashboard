const si = require('systeminformation');
const { insert, cleanup } = require('./db');

const INTERVAL_MS = 60 * 1000; // every 60 seconds
const RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours

async function collect() {
  try {
    const [load, temp, mem] = await Promise.all([
      si.currentLoad(),
      si.cpuTemperature(),
      si.mem(),
    ]);

    insert.run({
      timestamp: Date.now(),
      cpu_load: Math.round(load.currentLoad),
      temp_c: temp.main ?? null,
      mem_percent: Math.round((mem.used / mem.total) * 100),
    });

    cleanup.run({ cutoff: Date.now() - RETENTION_MS });
  } catch (err) {
    console.error('Collector error:', err.message);
  }
}

function startCollector() {
  collect(); // immediate first snapshot
  setInterval(collect, INTERVAL_MS);
}

module.exports = startCollector;

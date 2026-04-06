const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../data/stats.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS stats_history (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    cpu_load  REAL,
    temp_c    REAL,
    mem_percent REAL
  );
  CREATE INDEX IF NOT EXISTS idx_timestamp ON stats_history (timestamp);
`);

const insert = db.prepare(`
  INSERT INTO stats_history (timestamp, cpu_load, temp_c, mem_percent)
  VALUES (@timestamp, @cpu_load, @temp_c, @mem_percent)
`);

const cleanup = db.prepare(`
  DELETE FROM stats_history WHERE timestamp < @cutoff
`);

const getHistory = db.prepare(`
  SELECT timestamp, cpu_load, temp_c, mem_percent
  FROM stats_history
  WHERE timestamp >= @cutoff
  ORDER BY timestamp ASC
`);

module.exports = { insert, cleanup, getHistory };

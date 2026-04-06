import { useEffect, useState } from 'react';
import { getStats } from '../api';
import Header from '../components/Header';

function formatBytes(bytes) {
  const gb = bytes / 1024 ** 3;
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1024 ** 2).toFixed(0)} MB`;
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function StatCard({ label, value, sub, percent }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
      {percent !== undefined && (
        <div className="stat-bar">
          <div className="stat-bar-fill" style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function fetchStats() {
      try {
        const data = await getStats();
        if (active) setStats(data);
      } catch {
        if (active) setError('Failed to load stats');
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="dashboard">
      <Header />

      {error && <p className="error">{error}</p>}

      {!stats ? (
        <p className="loading">Loading...</p>
      ) : (
        <div className="stat-grid">
          <StatCard
            label="CPU Load"
            value={`${stats.cpu.load}%`}
            sub={`${stats.cpu.cores} cores · ${stats.cpu.speed} GHz`}
            percent={stats.cpu.load}
          />
          <StatCard
            label="Temperature"
            value={stats.temperature.main !== null ? `${stats.temperature.main}°C` : 'N/A'}
          />
          <StatCard
            label="Memory"
            value={`${stats.memory.percent}%`}
            sub={`${formatBytes(stats.memory.used)} / ${formatBytes(stats.memory.total)}`}
            percent={stats.memory.percent}
          />
          {stats.disk && (
            <StatCard
              label="Disk"
              value={`${stats.disk.percent}%`}
              sub={`${formatBytes(stats.disk.used)} / ${formatBytes(stats.disk.size)} (${stats.disk.mount})`}
              percent={stats.disk.percent}
            />
          )}
          <StatCard
            label="Uptime"
            value={formatUptime(stats.uptime)}
          />
        </div>
      )}
    </div>
  );
}

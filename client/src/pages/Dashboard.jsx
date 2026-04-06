import { useEffect, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { getStats, getHistory } from '../api';
import { usePrefs, toDisplayTemp } from '../context/PrefsContext';
import Header from '../components/Header';
import StatDetail from '../components/StatDetail';

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

function Sparkline({ data, dataKey, color }) {
  if (!data || data.length < 2) return <div className="sparkline-empty" />;
  return (
    <ResponsiveContainer width="100%" height={48}>
      <LineChart data={data}>
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} dot={false} />
        <Tooltip
          contentStyle={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 6, fontSize: 11 }}
          formatter={(v) => [`${Math.round(v)}`, '']}
          labelFormatter={() => ''}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function StatCard({ label, value, sub, onClick, children }) {
  return (
    <div className="stat-card stat-card-clickable" onClick={onClick}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
      <div className="stat-sparkline">{children}</div>
      <div className="stat-card-hint">click for details</div>
    </div>
  );
}

function PlainCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const { tempUnit } = usePrefs();

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

    async function fetchHistory() {
      try {
        const data = await getHistory();
        if (active) setHistory(data);
      } catch {}
    }

    fetchStats();
    fetchHistory();
    const statsInterval = setInterval(fetchStats, 3000);
    const historyInterval = setInterval(fetchHistory, 60000);

    return () => {
      active = false;
      clearInterval(statsInterval);
      clearInterval(historyInterval);
    };
  }, []);

  const tempHistory = history.map((r) => ({
    t: r.timestamp,
    value: toDisplayTemp(r.temp_c, tempUnit),
  }));

  const tempDisplay = stats
    ? toDisplayTemp(stats.temperature.main, tempUnit)
    : null;

  return (
    <div className="dashboard">
      <Header />
      <div className="dashboard-content">
        {error && <p className="error">{error}</p>}
        {!stats ? (
          <p className="loading">Loading...</p>
        ) : (
          <div className="stat-grid">
            <StatCard
              label="CPU Load"
              value={`${stats.cpu.load}%`}
              sub={`${stats.cpu.cores} cores · ${stats.cpu.speed} GHz`}
              onClick={() => setDetail('cpu')}
            >
              <Sparkline data={history} dataKey="cpu_load" color="#6366f1" />
            </StatCard>

            <StatCard
              label="Temperature"
              value={tempDisplay !== null ? `${Math.round(tempDisplay)}°${tempUnit}` : 'N/A'}
              onClick={() => setDetail('temperature')}
            >
              <Sparkline data={tempHistory} dataKey="value" color="#f97316" />
            </StatCard>

            <StatCard
              label="Memory"
              value={`${stats.memory.percent}%`}
              sub={`${formatBytes(stats.memory.used)} / ${formatBytes(stats.memory.total)}`}
              onClick={() => setDetail('memory')}
            >
              <Sparkline data={history} dataKey="mem_percent" color="#22d3ee" />
            </StatCard>

            {stats.disk && (
              <PlainCard
                label="Disk"
                value={`${stats.disk.percent}%`}
                sub={`${formatBytes(stats.disk.used)} / ${formatBytes(stats.disk.size)} (${stats.disk.mount})`}
              />
            )}

            <PlainCard
              label="Uptime"
              value={formatUptime(stats.uptime)}
            />
          </div>
        )}
      </div>

      {detail && <StatDetail stat={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

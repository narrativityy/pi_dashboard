import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getHistory } from '../api';
import { usePrefs, toDisplayTemp } from '../context/PrefsContext';

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const CONFIG = {
  cpu: {
    label: 'CPU Load',
    key: 'cpu_load',
    unit: '%',
    color: '#6366f1',
    domain: [0, 100],
  },
  memory: {
    label: 'Memory',
    key: 'mem_percent',
    unit: '%',
    color: '#22d3ee',
    domain: [0, 100],
  },
  temperature: {
    label: 'Temperature',
    key: 'temp_c',
    color: '#f97316',
  },
};

export default function StatDetail({ stat, onClose }) {
  const [history, setHistory] = useState([]);
  const { tempUnit } = usePrefs();
  const cfg = CONFIG[stat];

  useEffect(() => {
    getHistory().then(setHistory).catch(console.error);
  }, []);

  const data = history.map((row) => ({
    time: row.timestamp,
    value: stat === 'temperature'
      ? toDisplayTemp(row.temp_c, tempUnit)
      : row[cfg.key],
  }));

  const unit = stat === 'temperature' ? `°${tempUnit}` : cfg.unit;
  const domain = stat === 'temperature' ? ['auto', 'auto'] : cfg.domain;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{cfg.label} — Last 24 Hours</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {data.length === 0 ? (
          <p className="loading">Collecting data — check back in a minute.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${stat}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={cfg.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={cfg.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
              <XAxis dataKey="time" tickFormatter={formatTime} tick={{ fill: '#64748b', fontSize: 11 }} minTickGap={40} />
              <YAxis domain={domain} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `${Math.round(v)}${unit}`} width={55} />
              <Tooltip
                contentStyle={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 8 }}
                labelStyle={{ color: '#64748b', fontSize: 11 }}
                labelFormatter={(v) => formatTime(v)}
                formatter={(v) => [`${Math.round(v)}${unit}`, cfg.label]}
              />
              <Area type="monotone" dataKey="value" stroke={cfg.color} fill={`url(#grad-${stat})`} strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

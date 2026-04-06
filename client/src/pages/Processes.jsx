import { useEffect, useState } from 'react';
import { getProcesses, killProcess } from '../api';
import Header from '../components/Header';
import PasswordModal from '../components/PasswordModal';

function cpuColor(pct) {
  if (pct >= 50) return '#f87171';
  if (pct >= 20) return '#facc15';
  if (pct >= 5)  return '#e2e8f0';
  return '#64748b';
}

function SortIcon({ active, dir }) {
  if (!active) return <span className="sort-icon sort-icon-idle">↕</span>;
  return <span className="sort-icon sort-icon-active">{dir === 'asc' ? '↑' : '↓'}</span>;
}

export default function Processes() {
  const [data, setData] = useState({ total: 0, list: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [killTarget, setKillTarget] = useState(null);
  const [pending, setPending] = useState({});
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('cpu');
  const [sortDir, setSortDir] = useState('desc');

  async function fetchProcesses() {
    try {
      const d = await getProcesses();
      setData(d);
    } catch {
      setError('Failed to load processes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProcesses();
    const interval = setInterval(fetchProcesses, 5000);
    return () => clearInterval(interval);
  }, []);

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortKey(key); setSortDir('desc'); }
  }

  const filtered = data.list.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.user.toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    const mul = sortDir === 'desc' ? -1 : 1;
    if (typeof a[sortKey] === 'string') return mul * a[sortKey].localeCompare(b[sortKey]);
    return mul * (a[sortKey] - b[sortKey]);
  });

  async function handleKillConfirm(password) {
    const pid = killTarget;
    setPending((p) => ({ ...p, [pid]: true }));
    setKillTarget(null);
    try {
      await killProcess(pid, password);
      await fetchProcesses();
    } catch (err) {
      setPending((p) => ({ ...p, [pid]: false }));
      throw err;
    }
    setPending((p) => ({ ...p, [pid]: false }));
  }

  const cols = [
    { key: 'pid',  label: 'PID'  },
    { key: 'name', label: 'Name' },
    { key: 'user', label: 'User' },
    { key: 'cpu',  label: 'CPU%' },
    { key: 'mem',  label: 'MEM%' },
  ];

  return (
    <div className="dashboard">
      <Header />
      <div className="dashboard-content">
        <div className="proc-toolbar">
          <h2 className="section-title" style={{ marginBottom: 0 }}>Processes</h2>
          <span className="proc-count">
            {filtered.length} of {data.total} shown
          </span>
          <input
            className="proc-search"
            type="text"
            placeholder="Filter by name or user…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}

        {loading ? (
          <p className="loading" style={{ marginTop: 16 }}>Loading...</p>
        ) : (
          <div className="processes-wrapper">
            <table className="processes-table">
              <thead>
                <tr>
                  {cols.map(({ key, label }) => (
                    <th key={key} className="proc-th-sortable" onClick={() => toggleSort(key)}>
                      {label} <SortIcon active={sortKey === key} dir={sortDir} />
                    </th>
                  ))}
                  <th className="proc-col-cmd">Command</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((proc) => (
                  <tr key={proc.pid}>
                    <td className="proc-pid">{proc.pid}</td>
                    <td className="proc-name">{proc.name}</td>
                    <td className="proc-user">{proc.user}</td>
                    <td>
                      <span style={{ color: cpuColor(proc.cpu), fontVariantNumeric: 'tabular-nums' }}>
                        {proc.cpu.toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', color: '#94a3b8' }}>
                      {proc.mem.toFixed(1)}%
                    </td>
                    <td className="proc-command">{proc.command}</td>
                    <td>
                      <button
                        className="svc-btn svc-btn-stop"
                        disabled={!!pending[proc.pid]}
                        onClick={() => setKillTarget(proc.pid)}
                      >
                        {pending[proc.pid] ? '…' : 'Kill'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {killTarget !== null && (
        <PasswordModal
          prompt={`Enter your password to kill PID ${killTarget}.`}
          onConfirm={handleKillConfirm}
          onCancel={() => setKillTarget(null)}
        />
      )}
    </div>
  );
}

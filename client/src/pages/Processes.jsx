import { useEffect, useState } from 'react';
import { getProcesses, killProcess } from '../api';
import Header from '../components/Header';
import PasswordModal from '../components/PasswordModal';

export default function Processes() {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [killTarget, setKillTarget] = useState(null);
  const [pending, setPending] = useState({});

  async function fetchProcesses() {
    try {
      const data = await getProcesses();
      setProcesses(data);
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

  return (
    <div className="dashboard">
      <Header />
      <div className="dashboard-content">
        <h2 className="section-title">Processes</h2>
        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="loading">Loading...</p>
        ) : (
          <div className="processes-wrapper">
            <table className="processes-table">
              <thead>
                <tr>
                  <th>PID</th>
                  <th>Name</th>
                  <th>User</th>
                  <th>CPU%</th>
                  <th>MEM%</th>
                  <th>Command</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {processes.map((proc) => (
                  <tr key={proc.pid}>
                    <td className="proc-pid">{proc.pid}</td>
                    <td className="proc-name">{proc.name}</td>
                    <td className="proc-user">{proc.user}</td>
                    <td>{proc.cpu.toFixed(1)}</td>
                    <td>{proc.mem.toFixed(1)}</td>
                    <td className="proc-command">{proc.command}</td>
                    <td>
                      <button
                        className="svc-btn svc-btn-stop"
                        disabled={!!pending[proc.pid]}
                        onClick={() => setKillTarget(proc.pid)}
                      >
                        {pending[proc.pid] ? '...' : 'Kill'}
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

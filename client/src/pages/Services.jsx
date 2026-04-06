import { useEffect, useState } from 'react';
import { getServices, serviceAction } from '../api';
import Header from '../components/Header';
import PasswordModal from '../components/PasswordModal';
import LogModal from '../components/LogModal';

const STATE_COLORS = {
  active: '#22c55e',
  inactive: '#64748b',
  failed: '#f87171',
  activating: '#facc15',
  deactivating: '#facc15',
  unknown: '#64748b',
};

function StatusBadge({ state }) {
  const color = STATE_COLORS[state] || STATE_COLORS.unknown;
  return (
    <span className="status-badge" style={{ background: color + '22', color }}>
      {state}
    </span>
  );
}

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState({});
  const [error, setError] = useState('');
  const [stopTarget, setStopTarget] = useState(null);
  const [logTarget, setLogTarget] = useState(null);

  async function fetchServices() {
    try {
      const data = await getServices();
      setServices(data);
    } catch {
      setError('Failed to load services');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchServices();
    const interval = setInterval(fetchServices, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleAction(name, action) {
    if (action === 'stop') {
      setStopTarget(name);
      return;
    }
    setPending((p) => ({ ...p, [name]: action }));
    try {
      await serviceAction(name, action);
      await fetchServices();
    } catch {
      setError(`Failed to ${action} ${name}`);
    } finally {
      setPending((p) => ({ ...p, [name]: null }));
    }
  }

  async function handleStopConfirm(password) {
    const name = stopTarget;
    setPending((p) => ({ ...p, [name]: 'stop' }));
    setStopTarget(null);
    try {
      await serviceAction(name, 'stop', password);
      await fetchServices();
    } catch (err) {
      setPending((p) => ({ ...p, [name]: null }));
      throw err; // re-throw so PasswordModal shows the error
    }
    setPending((p) => ({ ...p, [name]: null }));
  }

  return (
    <div className="dashboard">
      <Header />
      <div className="dashboard-content">
        <h2 className="section-title">Services</h2>
        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="loading">Loading...</p>
        ) : (
          <div className="services-list">
            {services.map((svc) => (
              <div key={svc.name} className="service-row">
                <div className="service-info">
                  <div className="service-name">{svc.name}</div>
                  <div className="service-desc">{svc.description}</div>
                </div>
                <div className="service-status">
                  <StatusBadge state={svc.activeState} />
                  <span className="service-substate">{svc.subState}</span>
                </div>
                <div className="service-actions">
                  <button
                    className="svc-btn svc-btn-logs"
                    onClick={() => setLogTarget(svc.name)}
                  >
                    Logs
                  </button>
                  <button
                    className="svc-btn svc-btn-start"
                    disabled={svc.activeState === 'active' || !!pending[svc.name]}
                    onClick={() => handleAction(svc.name, 'start')}
                  >
                    {pending[svc.name] === 'start' ? '...' : 'Start'}
                  </button>
                  <button
                    className="svc-btn svc-btn-restart"
                    disabled={!!pending[svc.name]}
                    onClick={() => handleAction(svc.name, 'restart')}
                  >
                    {pending[svc.name] === 'restart' ? '...' : 'Restart'}
                  </button>
                  <button
                    className="svc-btn svc-btn-stop"
                    disabled={svc.activeState !== 'active' || !!pending[svc.name]}
                    onClick={() => handleAction(svc.name, 'stop')}
                  >
                    {pending[svc.name] === 'stop' ? '...' : 'Stop'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {stopTarget && (
        <PasswordModal
          serviceName={stopTarget}
          onConfirm={handleStopConfirm}
          onCancel={() => setStopTarget(null)}
        />
      )}
      {logTarget && (
        <LogModal serviceName={logTarget} onClose={() => setLogTarget(null)} />
      )}
    </div>
  );
}

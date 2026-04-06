import { useEffect, useState } from 'react';
import { getServices, serviceAction } from '../api';
import Header from '../components/Header';

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
    </div>
  );
}

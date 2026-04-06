import { useEffect, useRef, useState } from 'react';
import { getServiceLogs } from '../api';

export default function LogModal({ serviceName, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  async function fetchLogs() {
    setLoading(true);
    setError('');
    try {
      const data = await getServiceLogs(serviceName);
      setLogs(data.logs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, [serviceName]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [logs]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-logs" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Logs — {serviceName}</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="svc-btn" onClick={fetchLogs} disabled={loading}>
              {loading ? '...' : 'Refresh'}
            </button>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>
        {error && <p className="error">{error}</p>}
        {loading && !logs.length ? (
          <p className="loading">Loading...</p>
        ) : (
          <div className="log-modal-body">
            <pre>
              {logs.join('\n') || 'No log output found.'}
              <span ref={bottomRef} />
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

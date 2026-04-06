import { useState, useEffect, useRef } from 'react';

export default function PasswordModal({ serviceName, onConfirm, onCancel }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onConfirm(password);
    } catch (err) {
      setError(err.message || 'Incorrect password');
      setPassword('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Confirm Stop</h2>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <p className="modal-desc">
          Enter your password to stop <strong>{serviceName}</strong>.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="password"
            className="modal-password-input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="error">{error}</p>}
          <div className="modal-footer">
            <button type="button" className="svc-btn" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="svc-btn svc-btn-stop-confirm" disabled={loading}>
              {loading ? 'Verifying...' : 'Stop Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

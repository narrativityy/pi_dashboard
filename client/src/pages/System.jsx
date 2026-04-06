import { useEffect, useState } from 'react';
import { getSystemInfo, systemAction } from '../api';
import Header from '../components/Header';
import PasswordModal from '../components/PasswordModal';

function formatBytes(bytes) {
  const gb = bytes / (1024 ** 3);
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 ** 2)).toFixed(0)} MB`;
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

export default function System() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [controlTarget, setControlTarget] = useState(null); // 'reboot' | 'shutdown'
  const [sent, setSent] = useState('');

  useEffect(() => {
    getSystemInfo()
      .then(setInfo)
      .catch(() => setError('Failed to load system info'))
      .finally(() => setLoading(false));
  }, []);

  async function handleControlConfirm(password) {
    await systemAction(controlTarget, password);
    setControlTarget(null);
    setSent(controlTarget === 'reboot' ? 'Reboot command sent — device is restarting.' : 'Shutdown command sent — device is powering off.');
  }

  return (
    <div className="dashboard">
      <Header />
      <div className="dashboard-content">
        <h2 className="section-title">System Info</h2>
        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="loading">Loading...</p>
        ) : info && (
          <div className="sysinfo-grid">
            <div className="stat-card">
              <div className="stat-label">Hostname</div>
              <div className="sysinfo-value">{info.hostname}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">OS</div>
              <div className="sysinfo-value">{info.distro} {info.release}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Kernel</div>
              <div className="sysinfo-value">{info.kernel}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Architecture</div>
              <div className="sysinfo-value">{info.arch}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">CPU</div>
              <div className="sysinfo-value">{info.cpuBrand}</div>
              <div className="stat-sub">{info.cpuCores} cores @ {info.cpuSpeed} GHz</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Memory</div>
              <div className="sysinfo-value">{formatBytes(info.totalMem)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Uptime</div>
              <div className="sysinfo-value">{formatUptime(info.uptime)}</div>
            </div>
          </div>
        )}

        <h2 className="section-title" style={{ marginTop: '32px' }}>System Controls</h2>
        {sent ? (
          <p style={{ color: '#22d3ee' }}>{sent}</p>
        ) : (
          <div className="danger-zone">
            <p className="danger-zone-desc">These actions require password confirmation and will affect the device immediately.</p>
            <div className="danger-zone-actions">
              <button className="svc-btn danger-btn-reboot" onClick={() => setControlTarget('reboot')}>
                Reboot
              </button>
              <button className="svc-btn danger-btn-shutdown" onClick={() => setControlTarget('shutdown')}>
                Shutdown
              </button>
            </div>
          </div>
        )}
      </div>

      {controlTarget && (
        <PasswordModal
          prompt={`Enter your password to ${controlTarget} the device.`}
          onConfirm={handleControlConfirm}
          onCancel={() => setControlTarget(null)}
        />
      )}
    </div>
  );
}

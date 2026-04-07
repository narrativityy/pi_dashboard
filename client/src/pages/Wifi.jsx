import { useEffect, useState } from 'react';
import { getWifiStatus, getWifiNetworks, wifiConnect, wifiDisconnect } from '../api';
import Header from '../components/Header';

function SignalBars({ bars, connected }) {
  const color = connected ? '#22c55e' : '#6366f1';
  const dim = '#2d3148';
  return (
    <span className="wifi-bars" title={`Signal: ${bars}/4`}>
      {[1, 2, 3, 4].map((b) => (
        <span
          key={b}
          className="wifi-bar"
          style={{
            height: `${b * 4 + 4}px`,
            background: b <= bars ? color : dim,
          }}
        />
      ))}
    </span>
  );
}

function ConnectModal({ network, onConfirm, onCancel }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onConfirm(network.ssid, network.secured ? password : null);
    } catch (err) {
      setError(err.message || 'Failed to connect');
      setPassword('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Connect to Network</h2>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <p className="modal-desc">
          {network.secured
            ? <>Enter the password for <strong>{network.ssid}</strong>.</>
            : <>Connect to open network <strong>{network.ssid}</strong>?</>}
        </p>
        <form onSubmit={handleSubmit}>
          {network.secured && (
            <input
              autoFocus
              type="password"
              className="modal-password-input"
              placeholder="WiFi password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}
          {error && <p className="error">{error}</p>}
          <div className="modal-footer">
            <button type="button" className="svc-btn" onClick={onCancel}>Cancel</button>
            <button
              type="submit"
              className="svc-btn svc-btn-start"
              style={{ borderColor: '#6366f1', color: '#6366f1' }}
              disabled={loading}
            >
              {loading ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Wifi() {
  const [status, setStatus] = useState(null);   // { internet, hotspot }
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [connectTarget, setConnectTarget] = useState(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [pendingSsid, setPendingSsid] = useState(null);

  async function fetchAll(rescan = false) {
    try {
      const [s, n] = await Promise.all([getWifiStatus(), getWifiNetworks(rescan)]);
      setStatus(s);
      setNetworks(n);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setScanning(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  async function handleRescan() {
    setScanning(true);
    await fetchAll(true);
  }

  async function handleConnect(ssid, password) {
    setPendingSsid(ssid);
    setConnectTarget(null);
    try {
      await wifiConnect(ssid, password);
      await fetchAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingSsid(null);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await wifiDisconnect();
      await fetchAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setDisconnecting(false);
    }
  }

  const { internet, hotspot } = status || {};

  return (
    <div className="dashboard">
      <Header />
      <div className="dashboard-content">

        <h2 className="section-title">WiFi</h2>

        {error && <p className="error" style={{ marginBottom: '16px' }}>{error}</p>}

        {/* Interface status cards */}
        <div className="wifi-iface-grid">

          {/* Hotspot card */}
          <div className="wifi-iface-card">
            <div className="wifi-iface-header">
              <span className="wifi-iface-label">Hotspot</span>
              {hotspot ? (
                <span className={`wifi-badge ${hotspot.active ? 'badge-green' : 'badge-dim'}`}>
                  {hotspot.active ? 'Active' : 'Inactive'}
                </span>
              ) : (
                <span className="wifi-badge badge-dim">No dongle</span>
              )}
            </div>

            {hotspot ? (
              <div className="wifi-iface-body">
                <div className="wifi-iface-row">
                  <span className="wifi-iface-key">Interface</span>
                  <span className="wifi-iface-val">{hotspot.device}</span>
                </div>
                <div className="wifi-iface-row">
                  <span className="wifi-iface-key">SSID</span>
                  <span className="wifi-iface-val">{hotspot.ssid || '—'}</span>
                </div>
                <div className="wifi-iface-row">
                  <span className="wifi-iface-key">IP Address</span>
                  <span className="wifi-iface-val">{hotspot.ip || '—'}</span>
                </div>
              </div>
            ) : (
              <p className="wifi-iface-empty">USB WiFi dongle not detected.</p>
            )}
          </div>

          {/* Internet card */}
          <div className="wifi-iface-card">
            <div className="wifi-iface-header">
              <span className="wifi-iface-label">Internet</span>
              {internet ? (
                <span className={`wifi-badge ${internet.connected ? 'badge-green' : 'badge-dim'}`}>
                  {internet.connected ? 'Connected' : 'Disconnected'}
                </span>
              ) : (
                <span className="wifi-badge badge-dim">No interface</span>
              )}
            </div>

            {internet ? (
              <div className="wifi-iface-body">
                <div className="wifi-iface-row">
                  <span className="wifi-iface-key">Interface</span>
                  <span className="wifi-iface-val">{internet.device}</span>
                </div>
                <div className="wifi-iface-row">
                  <span className="wifi-iface-key">SSID</span>
                  <span className="wifi-iface-val">{internet.ssid || '—'}</span>
                </div>
                <div className="wifi-iface-row">
                  <span className="wifi-iface-key">IP Address</span>
                  <span className="wifi-iface-val">{internet.ip || '—'}</span>
                </div>
                {internet.connected && (
                  <div style={{ marginTop: '12px' }}>
                    <button
                      className="svc-btn svc-btn-stop"
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      style={{ width: '100%' }}
                    >
                      {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="wifi-iface-empty">No managed WiFi interface found.</p>
            )}
          </div>

        </div>

        {/* Available networks */}
        <div className="wifi-header-row" style={{ marginTop: '28px' }}>
          <h3 className="section-title" style={{ marginBottom: 0, fontSize: '1rem' }}>
            Available Networks
          </h3>
          <button className="svc-btn" onClick={handleRescan} disabled={scanning || loading}>
            {scanning ? 'Scanning...' : 'Scan'}
          </button>
        </div>

        {loading ? (
          <p className="loading" style={{ marginTop: '16px' }}>Loading...</p>
        ) : (
          <div className="wifi-list">
            {networks.length === 0 && (
              <p className="loading">No networks found. Try scanning.</p>
            )}
            {networks.map((net) => (
              <div
                key={net.ssid}
                className={`wifi-row${net.connected ? ' wifi-row-connected' : ''}`}
              >
                <SignalBars bars={net.bars} connected={net.connected} />
                <div className="wifi-info">
                  <div className="wifi-ssid">{net.ssid}</div>
                  <div className="wifi-meta">
                    {net.security}
                    {net.connected && <span className="wifi-connected-badge">Connected</span>}
                  </div>
                </div>
                <div className="wifi-signal-pct">{net.signal}%</div>
                {net.connected ? (
                  <button
                    className="svc-btn svc-btn-stop"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                  >
                    {disconnecting ? '...' : 'Disconnect'}
                  </button>
                ) : (
                  <button
                    className="svc-btn svc-btn-start"
                    disabled={pendingSsid === net.ssid}
                    onClick={() => setConnectTarget(net)}
                  >
                    {pendingSsid === net.ssid ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

      </div>

      {connectTarget && (
        <ConnectModal
          network={connectTarget}
          onConfirm={handleConnect}
          onCancel={() => setConnectTarget(null)}
        />
      )}
    </div>
  );
}

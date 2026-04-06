import { useEffect, useRef, useState } from 'react';
import { listFiles, downloadFileUrl, uploadFile } from '../api';
import Header from '../components/Header';

function formatSize(bytes) {
  if (bytes === null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function formatDate(ms) {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function Breadcrumb({ path, onNavigate }) {
  const parts = path === '/' ? [] : path.split('/').filter(Boolean);
  return (
    <div className="file-breadcrumb">
      <button className="file-crumb" onClick={() => onNavigate('/')}>~</button>
      {parts.map((part, i) => {
        const to = '/' + parts.slice(0, i + 1).join('/');
        return (
          <span key={to}>
            <span className="file-crumb-sep">/</span>
            <button className="file-crumb" onClick={() => onNavigate(to)}>{part}</button>
          </span>
        );
      })}
    </div>
  );
}

export default function Files() {
  const [path, setPath] = useState('/');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  async function load(p) {
    setLoading(true);
    setError('');
    try {
      const data = await listFiles(p);
      setPath(data.path);
      setItems(data.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load('/'); }, []);

  function navigate(p) { load(p); }

  function goUp() {
    if (path === '/') return;
    const parent = path.split('/').slice(0, -1).join('/') || '/';
    load(parent);
  }

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      await uploadFile(path, file);
      await load(path);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="dashboard">
      <Header />
      <div className="dashboard-content">
        <div className="file-toolbar">
          <Breadcrumb path={path} onNavigate={navigate} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="svc-btn" onClick={goUp} disabled={path === '/' || loading}>↑ Up</button>
            <button
              className="svc-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
            <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleUpload} />
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        {loading ? (
          <p className="loading">Loading...</p>
        ) : items.length === 0 ? (
          <p className="loading">Empty directory.</p>
        ) : (
          <div className="file-list">
            {items.map((item) => (
              <div key={item.path} className="file-row">
                <span className="file-icon">{item.type === 'dir' ? '📁' : '📄'}</span>
                <div className="file-info">
                  {item.type === 'dir' ? (
                    <button className="file-name file-name-dir" onClick={() => navigate(item.path)}>
                      {item.name}
                    </button>
                  ) : (
                    <a
                      className="file-name file-name-file"
                      href={downloadFileUrl(item.path)}
                      download={item.name}
                    >
                      {item.name}
                    </a>
                  )}
                  <div className="file-meta">
                    {item.size !== null && <span>{formatSize(item.size)}</span>}
                    <span>{formatDate(item.modified)}</span>
                  </div>
                </div>
                {item.type === 'file' && (
                  <a
                    className="svc-btn"
                    href={downloadFileUrl(item.path)}
                    download={item.name}
                    style={{ textDecoration: 'none', fontSize: '0.8rem' }}
                  >
                    Download
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

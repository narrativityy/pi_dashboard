import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../api';
import { usePrefs } from '../context/PrefsContext';
import { useStats } from '../context/StatsContext';

const STATUS_COLOR = { connected: '#22c55e', connecting: '#facc15', disconnected: '#f87171' };
const STATUS_LABEL = { connected: 'Live', connecting: 'Connecting…', disconnected: 'Disconnected' };

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/services',  label: 'Services'  },
  { to: '/processes', label: 'Processes' },
  { to: '/files',     label: 'Files'     },
  { to: '/wifi',      label: 'WiFi'      },
  { to: '/terminal',  label: 'Terminal'  },
  { to: '/system',    label: 'System'    },
];

export default function Header() {
  const navigate = useNavigate();
  const { tempUnit, toggleTempUnit } = usePrefs();
  const { wsStatus } = useStats();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const sidebarContent = (
    <>
      <div className="sidebar-brand">Pi Dashboard</div>
      <nav className="sidebar-nav">
        {NAV_LINKS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
            onClick={() => setOpen(false)}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <span className="ws-status" title={STATUS_LABEL[wsStatus]}>
          <span className="ws-dot" style={{ background: STATUS_COLOR[wsStatus] }} />
          {STATUS_LABEL[wsStatus]}
        </span>
        <button className="unit-toggle" onClick={toggleTempUnit}>
          °{tempUnit === 'F' ? 'C' : 'F'}
        </button>
        <button className="logout-btn" onClick={handleLogout}>Log out</button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <button className="hamburger" onClick={() => setOpen(true)} aria-label="Open menu">
          <span /><span /><span />
        </button>
        <span className="mobile-title">Pi Dashboard</span>
        <span className="ws-dot" style={{ background: STATUS_COLOR[wsStatus] }} />
      </div>

      {/* Backdrop */}
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar${open ? ' sidebar-open' : ''}`}>
        {sidebarContent}
      </aside>
    </>
  );
}

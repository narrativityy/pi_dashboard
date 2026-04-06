import { NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../api';
import { usePrefs } from '../context/PrefsContext';

export default function Header() {
  const navigate = useNavigate();
  const { tempUnit, toggleTempUnit } = usePrefs();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header className="dashboard-header">
      <h1>Pi Dashboard</h1>
      <nav className="nav">
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Dashboard
        </NavLink>
        <NavLink to="/terminal" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Terminal
        </NavLink>
      </nav>
      <div className="header-actions">
        <button className="unit-toggle" onClick={toggleTempUnit}>
          °{tempUnit === 'F' ? 'C' : 'F'}
        </button>
        <button className="logout-btn" onClick={handleLogout}>Log out</button>
      </div>
    </header>
  );
}

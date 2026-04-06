import { NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../api';

export default function Header() {
  const navigate = useNavigate();

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
      <button className="logout-btn" onClick={handleLogout}>Log out</button>
    </header>
  );
}

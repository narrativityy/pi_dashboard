import { useNavigate } from 'react-router-dom';
import { logout } from '../api';

export default function Dashboard() {
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <button onClick={handleLogout}>Log out</button>
    </div>
  );
}

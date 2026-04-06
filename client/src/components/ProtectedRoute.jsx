import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { verify } from '../api';

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    verify()
      .then(() => setStatus('ok'))
      .catch(() => setStatus('unauthed'));
  }, []);

  if (status === 'loading') return null;
  if (status === 'unauthed') return <Navigate to="/login" replace />;
  return children;
}

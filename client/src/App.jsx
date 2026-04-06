import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Terminal from './pages/Terminal';
import Services from './pages/Services';
import System from './pages/System';
import Processes from './pages/Processes';
import Wifi from './pages/Wifi';
import Files from './pages/Files';
import ProtectedRoute from './components/ProtectedRoute';
import { StatsProvider } from './context/StatsContext';

export default function App() {
  return (
    <BrowserRouter>
      <StatsProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/terminal"
          element={
            <ProtectedRoute>
              <Terminal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/services"
          element={
            <ProtectedRoute>
              <Services />
            </ProtectedRoute>
          }
        />
        <Route
          path="/system"
          element={
            <ProtectedRoute>
              <System />
            </ProtectedRoute>
          }
        />
        <Route
          path="/processes"
          element={
            <ProtectedRoute>
              <Processes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wifi"
          element={
            <ProtectedRoute>
              <Wifi />
            </ProtectedRoute>
          }
        />
        <Route
          path="/files"
          element={
            <ProtectedRoute>
              <Files />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      </StatsProvider>
    </BrowserRouter>
  );
}

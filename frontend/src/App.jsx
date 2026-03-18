import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home'
import RegisterMechanic from './pages/RegisterMechanic'
import MechanicDashboard from './pages/MechanicDashboard';
import TrackingPage from './pages/TrackingPage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import TowTruckDashboard from './pages/TowTruckDashboard';
import Toast from './components/Toast';

// Protected Route Component
const ProtectedRoute = ({ children, roleRequired }) => {
  const role = localStorage.getItem('userRole');
  const userPhone = localStorage.getItem('userPhone');
  const mechPhone = localStorage.getItem('mechanicPhone');
  const adminPhone = localStorage.getItem('adminPhone');

  // No role stored → redirect to login
  if (!role) return <Navigate to="/login" replace />;

  // Role-specific auth checks
  if (role === 'user' && !userPhone) return <Navigate to="/login" replace />;
  if (role === 'mechanic' && !mechPhone) return <Navigate to="/login" replace />;
  if (role === 'admin' && !adminPhone) return <Navigate to="/login" replace />;
  if (role === 'tow_truck' && !userPhone) return <Navigate to="/tow-dashboard" replace />;

  // Route requires a specific role that doesn't match
  if (roleRequired && role !== roleRequired) {
    if (role === 'mechanic') return <Navigate to="/dashboard" replace />;
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'tow_truck') return <Navigate to="/tow-dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage theme={theme} showToast={showToast} />} />
        
        <Route path="/" element={
          <ProtectedRoute roleRequired="user">
            <Home theme={theme} toggleTheme={toggleTheme} showToast={showToast} />
          </ProtectedRoute>
        } />
        
        <Route path="/register-mechanic" element={<RegisterMechanic theme={theme} toggleTheme={toggleTheme} showToast={showToast} />} />
        
        <Route path="/dashboard" element={
          <ProtectedRoute roleRequired="mechanic">
            <MechanicDashboard theme={theme} toggleTheme={toggleTheme} showToast={showToast} />
          </ProtectedRoute>
        } />
        
        <Route path="/tracking/:requestId" element={
          <ProtectedRoute roleRequired="user">
            <TrackingPage theme={theme} toggleTheme={toggleTheme} showToast={showToast} />
          </ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute roleRequired="admin">
            <AdminDashboard theme={theme} toggleTheme={toggleTheme} showToast={showToast} />
          </ProtectedRoute>
        } />

        <Route path="/tow-dashboard" element={
          <TowTruckDashboard theme={theme} toggleTheme={toggleTheme} showToast={showToast} />
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      {toast && (
        <div className="toast-fixed-wrapper">
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        </div>
      )}
    </Router>
  )
}

export default App

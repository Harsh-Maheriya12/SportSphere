import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/HomePage'; // IMPORT THE NEW HOMEPAGE

// A component to protect routes that require authentication.
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// A component for public routes. If the user is logged in, it redirects them to the dashboard.
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();
  
    if (isLoading) return <div>Loading...</div>;
    if (isAuthenticated) return <Navigate to="/dashboard" replace />;
    return <>{children}</>;
};


// THE APP COMPONENT IS THE CENTRAL ROUTER
const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes are wrapped in PublicRoute to redirect logged-in users */}
      <Route path="/" element={<PublicRoute><HomePage /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* Protected Routes are wrapped in ProtectedRoute */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } 
      />

      {/* A catch-all route to redirect any unknown paths */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};


export default App;
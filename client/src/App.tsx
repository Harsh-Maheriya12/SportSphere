import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import HomePage from "./pages/HomePage";
import Venues from "./pages/Venues";
import Coaches from "./pages/Coaches";
import Games from "./pages/Games";
import MyBookings from "./pages/MyBookings";
import MyVenues from "./pages/MyVenues";
import HostGame from "./pages/HostGame";
import CoachProfile from "./pages/CoachProfile";
import Layout from "./components/Layout";

// A component to protect routes that require authentication.
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// A component for public routes. If the user is logged in, it redirects them to the dashboard.
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

// THE APP COMPONENT IS THE CENTRAL ROUTER
const App: React.FC = () => {
  return (
    <Layout>
      <Routes>
      {/* Home Route - Accessible to all */}
      <Route path="/" element={<HomePage />} />

      {/* Auth Routes - Only for non-authenticated users */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />

      {/* Public browsing routes */}
      <Route path="/venues" element={<Venues />} />
      <Route path="/coaches" element={<Coaches />} />
      <Route path="/coaches/:id" element={<CoachProfile />} />
      <Route path="/games" element={<Games />} />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-bookings"
        element={
          <ProtectedRoute>
            <MyBookings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-venues"
        element={
          <ProtectedRoute>
            <MyVenues />
          </ProtectedRoute>
        }
      />
      <Route
        path="/host-game"
        element={
          <ProtectedRoute>
            <HostGame />
          </ProtectedRoute>
        }
      />

      {/* A catch-all route to redirect any unknown paths */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

export default App;

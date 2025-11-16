import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPassword from "./pages/ForgotPassword";
import DashboardPage from "./pages/DashboardPage";
import HomePage from "./pages/HomePage";
import Venues from "./pages/Venues";
import Coaches from "./pages/Coaches";
import Games from "./pages/Games";
import MyBookings from "./pages/MyBookings";
import MyVenues from "./pages/MyVenues";
import MyProfile from "./pages/MyProfile";
import HostGame from "./pages/HostGame";
import CoachProfile from "./pages/CoachProfile";
import ManageCoachProfile from "./pages/coach/ManageCoachProfile";
import ManageCoachBookings from "./pages/coach/ManageCoachBooking";
import ManageCoachSlots from "./pages/coach/ManageCoachSlots";
import OAuthSuccess from "./pages/OAuth2Success";

// Protect routes requiring authentication
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

// Redirect authenticated users away from auth pages
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/venues" element={<Venues />} />
      <Route path="/coaches" element={<Coaches />} />
      <Route path="/coach/:id" element={<CoachProfile />} />
      <Route path="/games" element={<Games />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/oauth-success" element={<OAuthSuccess />} />

      {/* Auth routes (redirect if logged in) */}
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

      {/* Protected routes (require authentication) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coach-dashboard"
        element={<Navigate to="/coach-dashboard/profile" replace />}
      />
      <Route
        path="/coach-dashboard/profile"
        element={
          <ProtectedRoute>
            <ManageCoachProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coach-dashboard/slots"
        element={
          <ProtectedRoute>
            <ManageCoachSlots />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coach-dashboard/bookings"
        element={
          <ProtectedRoute>
            <ManageCoachBookings />
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
        path="/my-profile"
        element={
          <ProtectedRoute>
            <MyProfile />
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

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;

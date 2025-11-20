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
import ManageVenues from "./pages/venue-owner/ManageVenues";
import ManageSubVenues from "./pages/venue-owner/ManageSubVenues";
import ManageTimeSlots from "./pages/venue-owner/ManageTimeSlots";
import OAuthSuccess from "./pages/OAuth2Success";
import VenueDetails from "./pages/VenueDetails";
import TimeSlotBooking from "./pages/TimeSlotBooking";
import PaymentSuccess from "./pages/PaymentSuccess";
import Layout from "./components/Layout";
import FaqPage from "./pages/FaqPage";
import AdminUsers from "./pages/admin/Users";
import AdminCoaches from "./pages/admin/Coaches";
import AdminVenueOwners from "./pages/admin/VenueOwners";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import Overview from "./pages/admin/Overview";
import AdminTickets from "./pages/admin/Tickets";
import MyTickets from "./pages/MyTickets";


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
      <Route path="/faq" element={<FaqPage />} />

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

      {/* Venue Owner Dashboard Routes */}
      <Route
        path="/venue-dashboard"
        element={<Navigate to="/venue-dashboard/venues" replace />}
      />
      <Route
        path="/venue-dashboard/venues"
        element={
          <ProtectedRoute>
            <ManageVenues />
          </ProtectedRoute>
        }
      />
      <Route
        path="/venue-dashboard/subvenues"
        element={
          <ProtectedRoute>
            <ManageSubVenues />
          </ProtectedRoute>
        }
      />
      <Route
        path="/venue-dashboard/slots"
        element={
          <ProtectedRoute>
            <ManageTimeSlots />
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
        path="/payment-success"
        element={
          <ProtectedRoute>
            <PaymentSuccess />
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
        path="/my-tickets"
        element={
          <ProtectedRoute>
            <MyTickets />
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

      <Route 
      path="/venue/:id" 
      element={
        // <ProtectedRoute>
          <VenueDetails />
        // </ProtectedRoute>
      } />

      <Route 
      path="/venue/:id/book" 
      element={
        <ProtectedRoute>
          <TimeSlotBooking />
        </ProtectedRoute>
      } />

       
      {/* Admin pages */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/users" element={<AdminProtectedRoute><AdminUsers /></AdminProtectedRoute>} />
      <Route path="/admin/coaches" element={<AdminProtectedRoute><AdminCoaches /></AdminProtectedRoute>} />
      <Route path="/admin/venue-owners" element={<AdminProtectedRoute><AdminVenueOwners /></AdminProtectedRoute>} />
      <Route path="/admin/tickets" element={<AdminProtectedRoute><AdminTickets /></AdminProtectedRoute>} />
      <Route path="/admin" element={<AdminProtectedRoute><Overview /></AdminProtectedRoute>} />
      
      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import {
  Calendar,
  Clock,
  User,
  Check,
  X,
  MessageSquare,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  apiGetCoachsAllBooking,
  apiCoachAcceptBookingRequest,
  apiCoachRejectBookingRequest,
} from "../../services/api";
import CoachDashboardNav from "../../components/CoachDashboardNav";

interface Booking {
  _id: string;
  playerId: {
    _id: string;
    username: string;
    email: string;
    profilePhoto: string;
    age: number;
    gender: string;
  };
  coachID: {
    _id: string;
    username: string;
    email: string;
    profilePhoto: string;
    age: number;
    gender: string;
  };
  date: string;
  startTime: string;
  endTime: string;
  status: "pending" | "accepted" | "rejected";
  rejectionReason?: string;
  createdAt: string;
}

function ManageCoachBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rejectingBookingId, setRejectingBookingId] = useState<string | null>(
    null
  );
  const [rejectionReason, setRejectionReason] = useState("");

  // Remove Error Message
  useEffect(() => {
    if (error.length > 0) {
      {
        setTimeout(() => setError(""), 3000);
      }
    }
  }, [error]);

  // Remove Success Message
  useEffect(() => {
    if (success.length > 0) {
      {
        setTimeout(() => setSuccess(""), 3000);
      }
    }
  }, [success]);

  // Fetch bookings

  useEffect(() => {
    const loadBookings = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError("");
        const response = await apiGetCoachsAllBooking();
        if (response.success && response.bookings) {
          setBookings(response.bookings);
        }
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, [user]);

  // Handle Accept Booking

  const handleAcceptBooking = async (bookingId: string) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await apiCoachAcceptBookingRequest(bookingId);

      setSuccess("Booking accepted successfully!");

      // Reload bookings after accepting
      const response = await apiGetCoachsAllBooking();
      if (response.success && response.bookings) {
        setBookings(response.bookings);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectClick = (bookingId: string) => {
    setRejectingBookingId(bookingId);
    setRejectionReason("");
  };

  // Handle Reject Booking
  const handleRejectSubmit = async (bookingId: string) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await apiCoachRejectBookingRequest(bookingId, rejectionReason);

      setSuccess("Booking rejected successfully!");

      // Reload bookings after rejecting
      const response = await apiGetCoachsAllBooking();
      if (response.success && response.bookings) {
        setBookings(response.bookings);
      }

      setRejectingBookingId(null);
      setRejectionReason("");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const pendingBookings = bookings.filter((b) => b.status === "pending"); // Show only pending bookings

  if(user?.role !== "coach") {
     const navigate = useNavigate();
     navigate('/');
     return null;
  }

  return (
    <div className="min-h-screen bg-white/10 p-2 ">
      <CoachDashboardNav />

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/20 border-l-4 border-destructive text-foreground p-4 rounded-lg flex items-center space-x-2 mb-4">
          <div className="shrink-0 w-1 h-4 bg-destructive rounded-full" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-500/20 border-l-4 border-green-500 text-foreground p-4 rounded-lg flex items-center space-x-2 mb-4">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      <div className="bg-card p-6 rounded-xl shadow-sm border">
        <div className="space-y-6">
          {/* Pending Requests */}
          <div className="bg-card/80 backdrop-blur rounded-xl border border-primary/20 p-8">
            <h2 className="text-2xl font-bold mb-6 text-primary">
              Pending Requests ({pendingBookings.length})
            </h2>

            {pendingBookings.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-primary/20 rounded-lg">
                <MessageSquare className="w-12 h-12 mx-auto text-primary/50 mb-4" />
                <p className="text-muted-foreground mb-2 font-medium">
                  No pending requests
                </p>
                <p className="text-sm text-muted-foreground">
                  New booking requests will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-5 flex flex-col">
                {pendingBookings.map((booking) => (
                  <div
                    key={booking._id}
                    className="rounded-xl border border-yellow-500/30 hover:border-yellow-500/50 bg-yellow-500/5 p-6 shadow-sm hover:shadow-md transition-all"
                  >
                    {/* Name Photo Age Gender */}
                    <div className="flex items-start justify-between mb-4 mt-2 space-y-1 relative">
                      <div className="flex items-center gap-4 mt-1">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/20">
                          {booking.playerId.profilePhoto ? (
                            <img
                              src={booking.playerId.profilePhoto}
                              alt={booking.playerId.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                              <User className="w-6 h-6 text-primary" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {booking.playerId.username}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {booking.playerId.age} years •{" "}
                            {booking.playerId.gender.charAt(0).toUpperCase() +
                              booking.playerId.gender.slice(1)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Booking Details */}
                    <div className="flex flex-wrap items-center gap-3 md:gap-6 mb-4 text-sm font-medium">
                      <div>
                        <span className="px-3 py-1 bg-yellow-500/20 text-yellow-500 rounded-full text-xs font-medium">
                          Pending
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="font-medium">
                          {formatDate(booking.date)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="font-medium">
                          {booking.startTime} - {booking.endTime}
                        </span>
                      </div>
                    </div>

                    {/* Rejection Reason */}
                    {rejectingBookingId === booking._id ? (
                      <div className="space-y-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                        <label className="block text-sm font-semibold text-foreground">
                          Reason for Rejection (Optional)
                        </label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Let the player know why you're declining..."
                          rows={3}
                          maxLength={500}
                          className="w-full px-3 py-2 rounded-xl border border-red-500/30 bg-background text-foreground focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none transition-all"
                        />
                        <p className="text-xs text-muted-foreground">
                          {rejectionReason.length}/500 characters
                        </p>

                        {/* Final */}
                        <div className="flex flex-col sm:flex-row gap-2 pt-1">
                          <Button
                            onClick={() => handleRejectSubmit(booking._id)}
                            disabled={loading}
                            className="bg-red-500 hover:bg-red-500 flex-1 shadow-sm hover:shadow hover:border-white border-2 border-red-500 transition-all rounded-xl"
                          >
                            <X className="w-4 h-4 mr-2" />
                            {loading ? "Rejecting..." : "Confirm Rejection"}
                          </Button>

                          {/* Cancel */}
                          <Button
                            onClick={() => {
                              setRejectingBookingId(null);
                              setRejectionReason("");
                            }}
                            disabled={loading}
                            className="button-style1 flex-1 border-transparent"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-3">
                        {/* Accept */}
                        <Button
                          onClick={() => handleAcceptBooking(booking._id)}
                          disabled={loading}
                          className="bg-primary border-2 border-transparent text-white flex-1 shadow-sm hover:border-white rounded-xl transition-all"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          {loading ? "Accepting..." : "Accept"}
                        </Button>

                        {/* Reject */}
                        <Button
                          onClick={() => handleRejectClick(booking._id)}
                          disabled={loading}
                          className="bg-black/80 hover:bg-black border-2 border-gray-600 hover:border-gray-400 text-white flex-1 font-semibold rounded-xl transition-all"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManageCoachBookings;

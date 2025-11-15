import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  apiGetMyCoachBookings,
  apiGetCoachsAllBooking,
} from "../services/api";
import { User, Info, Calendar } from "lucide-react";
import BookingCard from "../components/cards/BookingCard";

interface Booking {
  _id: string;
  coachId?: {
    _id: string;
    username: string;
    email: string;
    profilePhoto: string;
  };
  playerId?: {
    _id: string;
    username: string;
    email: string;
    profilePhoto: string;
  };
  date: string;
  startTime: string;
  endTime: string;
  status: "pending" | "accepted" | "rejected";
  rejectionReason?: string;
  createdAt: string;
}

function MyBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "all" | "pending" | "accepted" | "rejected"
  >("all");

  // Fetch bookings
  useEffect(() => {
    const fetchBookings = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        let response;
        if (user.role === "player") {
          // Get player's coach bookings
          response = await apiGetMyCoachBookings();
        } else if (user.role === "coach") {
          // Get coach's booking requests from players
          response = await apiGetCoachsAllBooking();
        }

        if (response) {
          setBookings(response.bookings);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load bookings");
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [user]);

  const filteredBookings =
    activeTab === "all"
      ? bookings
      : bookings.filter((b) => b.status === activeTab);

  const getTabCount = (status: string) => {
    if (status === "all") return bookings.length;
    return bookings.filter((b) => b.status === status).length;
  };

  return (
    <div className="min-h-screen bg-white/10 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 justify-center flex">
            My <span className="text-primary">Bookings</span>
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-3 mb-6">
          {["all", "pending", "accepted", "rejected"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all border-2 ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                  : "bg-card/80 backdrop-blur border-primary/20 hover:border-primary/40 hover:bg-card"
              }`}
            >
              <span className="capitalize">{tab}</span>
              <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/20 text-xs">
                {getTabCount(tab)}
              </span>
            </button>
          ))}
        </div>

        {/* Loading*/}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary/20 border-t-primary"></div>
            <p className="text-muted-foreground text-lg">
              Loading your bookings...
            </p>
          </div>
        )}

        {/* Error*/}
        {error && (
          <div className="bg-destructive/20 border-l-4 border-destructive text-foreground p-6 rounded-xl flex items-start space-x-3 mb-6">
            <div className="shrink-0 w-1 h-4 bg-destructive rounded-full" />
            <div>
              <p className="font-semibold mb-1">Error Loading Bookings</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Empty*/}
        {!loading && !error && filteredBookings.length === 0 && (
          <div className="bg-card/80 backdrop-blur rounded-2xl border border-primary/20 p-16 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="w-10 h-10 text-primary/60" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">
              {activeTab === "all"
                ? "No Bookings Yet"
                : `No ${activeTab} bookings`}
            </h3>
          </div>
        )}

        {/* Bookings Grid */}
        {!loading && !error && filteredBookings.length > 0 && (
          <div className="grid gap-4">
            {filteredBookings.map((booking) => (
              <BookingCard key={booking._id} booking={booking} userRole={user?.role == "player"? "player":"coach"} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyBookings;

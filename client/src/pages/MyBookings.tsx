import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import {
  apiGetMyCoachBookings,
  apiGetCoachsAllBooking,
  apiGetMyVenueBookings,
  apiGetMyBookings,
  apiApproveJoinRequest,
  apiRejectJoinRequest,
  apiCancelJoinRequest,
  apiStartGameBooking,
  apiLeaveGame,
  apiCompleteGame,
  apiRateVenue,
} from "../services/api";
import { User, Info, Calendar, MapPin, Clock, X, IndianRupee, Users, Trophy } from "lucide-react";
import BookingCard from "../components/cards/BookingCard";
import { Game } from "../types";
import GameBookingCard from "../components/cards/GameBookingCard";
import GameBookingModal from "../components/cards/GameBookingModal";
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

interface VenueBooking {
  _id: string;
  venue: {
    _id: string;
    name: string;
    address?: string;
    city?: string;
    images?: string[];
  };
  subVenue: {
    _id: string;
    name: string;
  };
  sport: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  status: "confirmed" | "cancelled" | "pending" | "failed";
  createdAt: string;
}

// Helper functions
const formatTime = (dateStr: string) =>
  new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

const getHostedGamesTabCount = (hostedGames: Game[], key: string): number => {
  switch (key) {
    case "all":
      return hostedGames.length;
    case "pending-requests":
      return hostedGames.filter(g => g.joinRequests.some(r => r.status === "pending")).length;
    case "accepted-players":
      return hostedGames.filter(g => g.approvedPlayers.length > 0).length;
    case "completed":
      return hostedGames.filter(g => g.status === "Completed").length;
    case "cancelled":
      return hostedGames.filter(g => g.status === "Cancelled").length;
    case "payment-completed":
      return hostedGames.filter(g => g.bookingStatus === "Booked").length;
    default:
      return 0;
  }
};

const getPlayedGamesTabCount = (gameBookings: {
  hosted: Game[];
  joined: Game[];
  pending: Game[];
  rejected: Game[];
  cancelled: Game[];
  booked: Game[];
  completed: Game[];
}, status: string): number => {
  const hostedIds = new Set(gameBookings.hosted.map(g => g._id));
  const playedGames = Object.values(gameBookings)
    .flat()
    .filter(g => !hostedIds.has(g._id));

  switch (status) {
    case "all":
      return playedGames.length;
    case "pending-requests":
      return gameBookings.pending.length;
    case "cancelled-requests":
      return gameBookings.cancelled.length;
    case "completed":
      return gameBookings.completed.length;
    case "expired":
      return playedGames.filter(g => new Date(g.slot.endTime) < new Date() && g.status !== "Completed" && g.status !== "Cancelled").length;
    default:
      return 0;
  }
};

const getCoachTabCount = (bookings: Booking[], status: string): number => {
  if (status === "all") return bookings.length;
  return bookings.filter((b) => b.status === status).length;
};

function MyBookings() {
  const { user } = useAuth();
  const [bookingType, setBookingType] = useState<"coach" | "venue" | "game">("coach");
  const [coachBookings, setCoachBookings] = useState<Booking[]>([]);
  const [venueBookings, setVenueBookings] = useState<VenueBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "all" | "pending" | "accepted" | "rejected"
  >("all");
  const [selectedVenueBooking, setSelectedVenueBooking] = useState<VenueBooking | null>(null);
  const [gameSubTab, setGameSubTab] = useState<"hosted" | "played">("hosted");
  const [hostedGamesTab, setHostedGamesTab] = useState<"all" | "pending-requests" | "accepted-players" | "completed" | "cancelled" | "expired" | "payment-completed">("all");
  const [playedGamesTab, setPlayedGamesTab] = useState<"all" | "pending-requests" | "cancelled-requests" | "completed" | "cancelled" | "expired">("all");
  const [gameBookings, setGameBookings] = useState<{
    hosted: Game[];
    joined: Game[];
    pending: Game[];
    rejected: Game[];
    cancelled: Game[];
    booked: Game[];
    completed: Game[];
  }>({ hosted: [], joined: [], pending: [], rejected: [], cancelled: [], booked: [], completed: [] });

  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Fetch bookings
  useEffect(() => {
    const fetchBookings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        if (user.role === "player") {
          // Get coach, venue, and game bookings for players
          const [coachRes, venueRes, gameRes] = await Promise.all([
            apiGetMyCoachBookings(),
            apiGetMyVenueBookings(),
            apiGetMyBookings(),
          ]);
          setCoachBookings(coachRes.bookings);
          setVenueBookings(venueRes.bookings);
          setGameBookings(gameRes.bookings);
        } else if (user.role === "coach") {
          // Get coach's booking requests from players
          const response = await apiGetCoachsAllBooking();
          setCoachBookings(response.bookings);
        }
      } catch (err: any) {
        console.error("[MyBookings] Error fetching bookings:", err);
        setError(err.message || "Failed to load bookings");
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [user]);

  const filteredCoachBookings =
    activeTab === "all"
      ? coachBookings
      : coachBookings.filter((b) => b.status === activeTab);
  const filteredHostedGames = useMemo(() => {
    const hosted = gameBookings.hosted || [];
    switch (hostedGamesTab) {
      case "all": return hosted;
      case "pending-requests": return hosted.filter(g => (g.joinRequests || []).some((jr: any) => jr.status === "pending"));
      case "accepted-players": return hosted.filter(g => (g.approvedPlayers || []).length > 0);
      case "completed": return hosted.filter(g => g.status === "Completed");
      case "cancelled": return hosted.filter(g => g.status === "Cancelled");
      case "payment-completed": return hosted.filter(g => g.bookingStatus === "Booked");
      default: return hosted;
    }
  }, [gameBookings.hosted, hostedGamesTab]);

  const filteredPlayedGames = useMemo(() => {
    const hostedIds = new Set((gameBookings.hosted || []).map(h => h._id));
    const joined = (gameBookings.joined || []).filter(g => !hostedIds.has(g._id));
    const pending = (gameBookings.pending || []).filter(g => !hostedIds.has(g._id));
    const rejected = (gameBookings.rejected || []).filter(g => !hostedIds.has(g._id));
    const cancelled = (gameBookings.cancelled || []).filter(g => !hostedIds.has(g._id));
    const completed = (gameBookings.completed || []).filter(g => !hostedIds.has(g._id));
    const booked = (gameBookings.booked || []).filter(g => !hostedIds.has(g._id));

    switch (playedGamesTab) {
      case "all": return [...joined, ...pending, ...booked, ...completed];
      case "pending-requests": return pending;
      case "cancelled-requests": return [...rejected, ...cancelled];
      case "completed": return completed;
      case "expired": return [...joined, ...pending].filter(g => new Date(g.slot.startTime) < new Date() && g.status !== "Completed");
      default: return [...joined, ...pending, ...booked, ...completed];
    }
  }, [gameBookings, playedGamesTab]);

  const openGameModal = (game: Game) => {
    setActiveGame(game);
    setIsModalOpen(true);
  };

  const closeGameModal = () => {
    setActiveGame(null);
    setIsModalOpen(false);
  };

  const refetchGameBookings = async () => {
    try {
      const gameRes = await apiGetMyBookings();
      setGameBookings(gameRes.bookings);
    } catch (err) {
      console.error("Failed to refetch game bookings", err);
    }
  };

  const handleApprovePlayer = async (gameId: string, playerId: string) => {
    try {
      await apiApproveJoinRequest(gameId, playerId);
      await refetchGameBookings();
    } catch (err: any) {
      console.error("approve error", err);
      alert("Could not approve player");
    }
  };

  const handleRejectPlayer = async (gameId: string, playerId: string) => {
    try {
      await apiRejectJoinRequest(gameId, playerId);
      await refetchGameBookings();
    } catch (err: any) {
      console.error("reject error", err);
      alert("Could not reject player");
    }
  };

  const handleCancelJoinRequest = async (gameId: string) => {
    try {
      await apiCancelJoinRequest(gameId);
      await refetchGameBookings();
      closeGameModal();
    } catch (err: any) {
      console.error("cancel join request error", err);
      alert("Could not cancel request");
    }
  };

  const handleLeaveGame = async (gameId: string) => {
    try {
      await apiLeaveGame(gameId);
      await refetchGameBookings();
      closeGameModal();
    } catch (err: any) {
      console.error("leave game error", err);
      alert("Could not leave game");
    }
  };

  const handleStartGameBooking = async (gameId: string) => {
    try {
      setLoading(true);
      const res = await apiStartGameBooking(gameId);
      if (res.url) {
        window.location.href = res.url;
      } else {
        alert("No payment URL returned");
      }
    } catch (err: any) {
      console.error("start game booking error", err.message);
      alert("Could not start booking");
    } finally {
      setLoading(false);
    }
  };
  // calendar link removed — feature deprecated

  const handleCompleteGame = async (gameId: string) => {
    try {
      await apiCompleteGame(gameId);
      await refetchGameBookings();
    } catch (err: any) {
      console.error("complete game error", err);
      alert("Could not complete game");
    }
  };

  const handleRateVenue = async (gameId: string, rating: number) => {
    try {
      await apiRateVenue(gameId, rating);
      await refetchGameBookings();
      closeGameModal();
    } catch (err: any) {
      console.error("rate venue error", err);
      alert("Could not submit rating");
    }
  }

  return (
    <div className="min-h-screen bg-white/10 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 justify-center flex">
            My <span className="text-primary">Bookings</span>
          </h1>
        </div>

        {/* Booking Type Tabs (Coach vs Venue) - Only for players */}
        {user?.role === "player" && (
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setBookingType("coach")}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all border-2 ${bookingType === "coach"
                ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                : "bg-card/80 backdrop-blur border-primary/20 hover:border-primary/40 hover:bg-card"
                }`}
            >
              Coach Bookings
            </button>
            <button
              onClick={() => setBookingType("venue")}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all border-2 ${bookingType === "venue"
                ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                : "bg-card/80 backdrop-blur border-primary/20 hover:border-primary/40 hover:bg-card"
                }`}
            >
              Venue Bookings
            </button>
            <button
              onClick={() => setBookingType("game")}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all border-2 ${bookingType === "game"
                ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                : "bg-card/80 backdrop-blur border-primary/20 hover:border-primary/40 hover:bg-card"
                }`}
            >
              Game Bookings
            </button>
          </div>
        )}

        {/* Game Bookings Sub-Tabs: Hosted Games vs Games Played */}
        {bookingType === "game" && user?.role === "player" && (
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setGameSubTab("hosted")}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all border-2 ${gameSubTab === "hosted"
                ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                : "bg-card/80 backdrop-blur border-primary/20 hover:border-primary/40 hover:bg-card"
                }`}
            >
              Hosted Games
            </button>
            <button
              onClick={() => setGameSubTab("played")}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all border-2 ${gameSubTab === "played"
                ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                : "bg-card/80 backdrop-blur border-primary/20 hover:border-primary/40 hover:bg-card"
                }`}
            >
              Games Played
            </button>
          </div>
        )}

        {/* Hosted Games Secondary Tabs */}
        {bookingType === "game" && gameSubTab === "hosted" && user?.role === "player" && (
          <div className="flex flex-wrap gap-3 mb-6">
            {[
              { key: "all", label: "All Game Bookings" },
              { key: "pending-requests", label: "Pending Requests" },
              { key: "accepted-players", label: "Accepted Players" },
              { key: "completed", label: "Completed Games" },
              { key: "cancelled", label: "Cancelled Games" },
              { key: "payment-completed", label: "Payment Completed" }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setHostedGamesTab(tab.key as any)}
                className={`px-5 py-2.5 rounded-xl font-medium transition-all border-2 ${hostedGamesTab === tab.key
                  ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                  : "bg-card/80 backdrop-blur border-primary/20 hover:border-primary/40 hover:bg-card"
                  }`}
              >
                <span>{tab.label}</span>
                <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/20 text-xs">
                  {getHostedGamesTabCount(gameBookings.hosted, tab.key)}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Games Played Secondary Tabs */}
        {bookingType === "game" && gameSubTab === "played" && user?.role === "player" && (
          <div className="flex flex-wrap gap-3 mb-6">
            {[
              { key: "all", label: "All Joined Games" },
              { key: "pending-requests", label: "Pending Join Requests" },
              { key: "cancelled-requests", label: "Cancelled Join Requests" },
              { key: "completed", label: "Completed Games" },
              { key: "expired", label: "Expired Games" }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setPlayedGamesTab(tab.key as any)}
                className={`px-5 py-2.5 rounded-xl font-medium transition-all border-2 ${playedGamesTab === tab.key
                  ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                  : "bg-card/80 backdrop-blur border-primary/20 hover:border-primary/40 hover:bg-card"
                  }`}
              >
                <span>{tab.label}</span>
                <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/20 text-xs">
                  {getPlayedGamesTabCount(gameBookings, tab.key)}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Status Tabs - Only for coach bookings */}
        {bookingType === "coach" && (
          <div className="flex flex-wrap gap-3 mb-6">
            {["all", "pending", "accepted", "rejected"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as typeof activeTab)}
                className={`px-5 py-2.5 rounded-xl font-medium transition-all border-2 ${activeTab === tab
                  ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                  : "bg-card/80 backdrop-blur border-primary/20 hover:border-primary/40 hover:bg-card"
                  }`}
              >
                <span className="capitalize">{tab}</span>
                <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/20 text-xs">
                  {getCoachTabCount(coachBookings, tab)}
                </span>
              </button>
            ))}
          </div>
        )}

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
        {!loading && !error && bookingType === "coach" && filteredCoachBookings.length === 0 && (
          <div className="bg-card/80 backdrop-blur rounded-2xl border border-primary/20 p-16 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="w-10 h-10 text-primary/60" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">
              {activeTab === "all"
                ? "No Coach Bookings Yet"
                : `No ${activeTab} coach bookings`}
            </h3>
          </div>
        )}

        {!loading && !error && bookingType === "venue" && venueBookings.length === 0 && (
          <div className="bg-card/80 backdrop-blur rounded-2xl border border-primary/20 p-16 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="w-10 h-10 text-primary/60" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">
              No Venue Bookings Yet
            </h3>
          </div>
        )}

        {/* Coach Bookings Grid */}
        {!loading && !error && bookingType === "coach" && filteredCoachBookings.length > 0 && (
          <div className="grid gap-4">
            {filteredCoachBookings.map((booking) => (
              <BookingCard key={booking._id} booking={booking} userRole={user?.role === "player" ? "player" : "coach"} />
            ))}
          </div>
        )}

        {/* Venue Bookings Grid */}
        {!loading && !error && bookingType === "venue" && venueBookings.length > 0 && (
          <div className="grid gap-4">
            {venueBookings.map((booking) => (
              <div
                key={booking._id}
                className="bg-card/80 backdrop-blur rounded-xl border border-primary/20 p-6 hover:border-primary/40 transition cursor-pointer"
                onClick={() => setSelectedVenueBooking(booking)}
              >
                <div className="flex items-start gap-4">
                  <img
                    src={booking.venue.images?.[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=100&q=80"}
                    alt={booking.venue.name}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground mb-1">{booking.venue.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{booking.venue.city}, {booking.venue.address}</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded">{booking.subVenue.name}</span>
                      <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded">{booking.sport}</span>
                      <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded">{booking.price.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{new Date(booking.date).toLocaleDateString('en-IN', { timeZone: 'UTC' })}</span>
                      <span>{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${booking.status === "confirmed" ? "bg-green-600/20 text-green-400" :
                      booking.status === "pending" ? "bg-yellow-600/20 text-yellow-400" :
                        booking.status === "failed" ? "bg-red-600/20 text-red-400" :
                          "bg-red-600/20 text-red-400"
                      }`}>
                      {booking.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Venue Booking Details Modal */}
        {selectedVenueBooking && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedVenueBooking(null)}
          >
            <div
              className="bg-card/95 backdrop-blur-xl rounded-2xl border border-primary/30 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-primary/20 to-primary/10 backdrop-blur-xl border-b border-primary/20 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">Booking Details</h2>
                <button
                  onClick={() => setSelectedVenueBooking(null)}
                  className="p-2 hover:bg-primary/20 rounded-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Venue Image */}
                {selectedVenueBooking.venue.images?.[0] && (
                  <img
                    src={selectedVenueBooking.venue.images[0]}
                    alt={selectedVenueBooking.venue.name}
                    className="w-full h-48 object-cover rounded-xl"
                  />
                )}

                {/* Venue Info */}
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">{selectedVenueBooking.venue.name}</h3>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="w-5 h-5 mt-0.5 shrink-0" />
                    <p>{selectedVenueBooking.venue.address}, {selectedVenueBooking.venue.city}</p>
                  </div>
                </div>

                {/* Booking Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-primary/10 rounded-xl p-4">
                    <p className="text-sm text-muted-foreground mb-1">Court/Field</p>
                    <p className="text-lg font-semibold text-foreground">{selectedVenueBooking.subVenue.name}</p>
                  </div>

                  <div className="bg-blue-600/10 rounded-xl p-4">
                    <p className="text-sm text-muted-foreground mb-1">Sport</p>
                    <p className="text-lg font-semibold text-foreground capitalize">{selectedVenueBooking.sport}</p>
                  </div>

                  <div className="bg-purple-600/10 rounded-xl p-4">
                    <p className="text-sm text-muted-foreground mb-1">Date</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-purple-400" />
                      <p className="text-lg font-semibold text-foreground">
                        {new Date(selectedVenueBooking.date).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          timeZone: 'UTC'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="bg-orange-600/10 rounded-xl p-4">
                    <p className="text-sm text-muted-foreground mb-1">Time Slot</p>
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-orange-400" />
                      <p className="text-lg font-semibold text-foreground">
                        {formatTime(selectedVenueBooking.startTime)}
                        {" - "}
                        {formatTime(selectedVenueBooking.endTime)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-green-600/10 rounded-xl p-4">
                    <p className="text-sm text-muted-foreground mb-1">Amount Paid</p>
                    <div className="flex items-center gap-2">
                      <IndianRupee className="w-5 h-5 text-green-400" />
                      <p className="text-lg font-semibold text-foreground">{selectedVenueBooking.price.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</p>
                    </div>
                  </div>

                  <div className="bg-card/80 rounded-xl p-4 border border-primary/20">
                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                    <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-semibold ${selectedVenueBooking.status === "confirmed"
                      ? "bg-green-600/20 text-green-400"
                      : selectedVenueBooking.status === "pending"
                        ? "bg-yellow-600/20 text-yellow-400"
                        : "bg-red-600/20 text-red-400"
                      }`}>
                      {selectedVenueBooking.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Retry Payment Button */}
                {(selectedVenueBooking.status === "pending" || selectedVenueBooking.status === "failed") && (
                  <button
                    onClick={async () => {
                      try {
                        const { apiRetryPayment } = await import("../services/api");
                        const res = await apiRetryPayment(selectedVenueBooking._id);
                        if (res.success && res.url) {
                          window.location.href = res.url;
                        }
                      } catch (err) {
                        console.error("Retry payment failed", err);
                        alert("Failed to retry payment. The slot might be taken.");
                      }
                    }}
                    className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 transition shadow-lg shadow-primary/20"
                  >
                    Pay Now
                  </button>
                )}

                {/* Booking ID */}
                <div className="bg-muted/20 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-1">Booking ID</p>
                  <p className="text-xs font-mono text-foreground">{selectedVenueBooking._id}</p>
                </div>

                {/* Booked At */}
                <div className="text-sm text-muted-foreground text-center pt-4 border-t border-primary/10">
                  Booked on {new Date(selectedVenueBooking.createdAt).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Game Bookings - Hosted */}
        {!loading && !error && bookingType === "game" && gameSubTab === "hosted" && filteredHostedGames.length === 0 && (
          <div className="bg-card/80 backdrop-blur rounded-2xl border border-primary/20 p-16 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-10 h-10 text-primary/60" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">No Hosted Games Found</h3>
          </div>
        )}
        {!loading && !error && bookingType === "game" && gameSubTab === "hosted" && filteredHostedGames.length > 0 && (
          <div className="grid gap-4">
            {filteredHostedGames.map(game => (
              <div key={game._id} onClick={() => openGameModal(game)}>
                <GameBookingCard game={game} onClick={() => openGameModal(game)} isHost />
              </div>
            ))}
          </div>
        )}

        {/* Game Bookings — Played */}
        {!loading && !error && bookingType === "game" && gameSubTab === "played" && filteredPlayedGames.length === 0 && (
          <div className="bg-card/80 backdrop-blur rounded-2xl border border-primary/20 p-16 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="w-10 h-10 text-primary/60" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">No Games Played Yet</h3>
          </div>
        )}

        {!loading && !error && bookingType === "game" && gameSubTab === "played" && filteredPlayedGames.length > 0 && (
          <div className="grid gap-4">
            {filteredPlayedGames.map(game => (
              <div key={game._id} onClick={() => openGameModal(game)}>
                <GameBookingCard game={game} onClick={() => openGameModal(game)} isHost={false} />
              </div>
            ))}
          </div>
        )}
        {/* Game Booking Details Modal */}

        {activeGame && (
          <GameBookingModal
            open={isModalOpen}
            onOpenChange={(val) => { if (!val) closeGameModal(); }}
            game={activeGame}
            currentUser={user}
            // action handlers
            onApprovePlayer={handleApprovePlayer}
            onRejectPlayer={handleRejectPlayer}
            // onCreateJoinRequest={handleCreateJoinRequest}
            onCancelJoinRequest={handleCancelJoinRequest}
            onLeaveGame={handleLeaveGame}
            onStartGameBooking={handleStartGameBooking}
            onCompleteGame={handleCompleteGame}
            onRateVenue={handleRateVenue}
          />
        )}

      </div>
    </div>
  );
}

export default MyBookings;

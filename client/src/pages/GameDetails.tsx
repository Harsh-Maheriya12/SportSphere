import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  apiGetGameById,
  apiApproveJoinRequest,
  apiRejectJoinRequest,
  apiCreateJoinRequest,
  apiCancelJoinRequest,
  apiLeaveGame,
  apiCancelGame,
  apiRateVenue,
  apiStartGameBooking,
} from "../services/api";

import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Trophy,
  IndianRupee,
  User,
  UserPlus,
  UserX,
  XCircle,
  CheckCircle,
  Star,
  ArrowLeft,
  AlertCircle,
  CreditCard,
  Eye,
} from "lucide-react";

/**
 * Utility helpers to safely extract id/username from possibly mixed shapes:
 * - Accepts: string id, or object { _id, id, username }
 */
const getId = (u: any) => {
  if (!u) return null;
  if (typeof u === "string") return u;
  return u._id ?? u.id ?? null;
};

const getUsername = (u: any) => {
  if (!u) return "Unknown";
  if (typeof u === "string") return u;
  return u.username ?? u.name ?? getId(u) ?? "Unknown";
};

const GameDetails: React.FC = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [game, setGame] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Load Game
  const loadGame = async () => {
    if (!gameId) return;
    try {
      setLoading(true);
      const res = await apiGetGameById(gameId);
      if (res && res.success) setGame(res.game);
      else if (res && res.game) setGame(res.game);
      else setGame(null);
    } catch (err: any) {
      setMessage(err?.message ?? "Failed to load game");
      setGame(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  // Determine host (handles host as ID string or object)
  const isHost = useMemo(() => {
    if (!user || !game) return false;
    const hostId = getId(game.host);
    const userId = user.id || (user as any)._id;
    const result = hostId && (hostId === userId || hostId === user.id);
    console.log("isHost check:", { 
      userId: user.id, 
      userIdAlt: (user as any)._id,
      hostId, 
      gameHost: game.host,
      result 
    });
    return result;
  }, [user, game]);

  // Approved player check - handles both id strings and user objects
  const isApprovedPlayer = useMemo(() => {
    if (!user || !game) return false;
    const approved = game.approvedPlayers ?? [];
    const userId = user.id || (user as any)._id;
    const result = approved.some((p: any) => {
      const playerId = getId(p);
      return playerId === userId || playerId === user.id || playerId === (user as any)._id;
    });
    console.log("isApprovedPlayer check:", { 
      userId, 
      approvedPlayers: approved.map((p: any) => ({ raw: p, id: getId(p) })),
      result 
    });
    return result;
  }, [user, game]);

  // Pending request check - handles both user types
  const hasPendingRequest = useMemo(() => {
    if (!user || !game) return false;
    const requests = game.joinRequests ?? [];
    const userId = user.id || (user as any)._id;
    const result = requests.some((jr: any) => {
      const requestUserId = getId(jr.user);
      return jr?.status === "pending" && (requestUserId === userId || requestUserId === user.id || requestUserId === (user as any)._id);
    });
    console.log("hasPendingRequest check:", { 
      userId, 
      joinRequests: requests.map((r: any) => ({ 
        status: r.status, 
        userId: getId(r.user),
        raw: r 
      })),
      result 
    });
    return result;
  }, [user, game]);

  const handleJoin = async () => {
    if (!gameId) return;
    try {
      setActionLoading(true);
      await apiCreateJoinRequest(gameId);
      await loadGame();
    } catch (err: any) {
      setMessage(err?.message ?? "Failed to send join request");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelJoinRequest = async () => {
    if (!gameId) return;
    try {
      setActionLoading(true);
      await apiCancelJoinRequest(gameId);
      await loadGame();
    } catch (err: any) {
      setMessage(err?.message ?? "Failed to cancel join request");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveGame = async () => {
    if (!gameId) return;
    try {
      setActionLoading(true);
      await apiLeaveGame(gameId);
      await loadGame();
    } catch (err: any) {
      setMessage(err?.message ?? "Failed to leave game");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelGame = async () => {
    if (!gameId) return;
    try {
      setActionLoading(true);
      await apiCancelGame(gameId);
      navigate("/games");
    } catch (err: any) {
      setMessage(err?.message ?? "Failed to cancel game");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (player: any) => {
    if (!gameId) return;
    const playerId = getId(player);
    if (!playerId) return;
    try {
      setActionLoading(true);
      await apiApproveJoinRequest(gameId, playerId);
      await loadGame();
    } catch (err: any) {
      setMessage(err?.message ?? "Failed to approve player");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (player: any) => {
    if (!gameId) return;
    const playerId = getId(player);
    if (!playerId) return;
    try {
      setActionLoading(true);
      await apiRejectJoinRequest(gameId, playerId);
      await loadGame();
    } catch (err: any) {
      setMessage(err?.message ?? "Failed to reject player");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRating = async () => {
    if (!gameId) return;
    try {
      setActionLoading(true);
      await apiRateVenue(gameId, rating);
      setMessage("Rating submitted successfully!");
      await loadGame();
    } catch (err: any) {
      setMessage(err?.message ?? "Failed to rate venue");
    } finally {
      setActionLoading(false);
    }
  };

  // formatting helpers
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (value?: number | null) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return "0.00";
    return numericValue.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };
  
  const handleStartBooking = async () => {
    if (!gameId) return;
    try {
      setActionLoading(true);

      // Call your unified API wrapper
      const res = await apiStartGameBooking(gameId);

      // Redirect user to Stripe Checkout
      if (res.url) {
        window.location.href = res.url;
      } else {
        setMessage("Failed to start payment. Try again.");
      }
    } catch (err: any) {
      setMessage(err?.message ?? "Failed to initiate booking");
    } finally {
      setActionLoading(false);
    }
  }
  // UI derived values
  const approvedPlayers = (game?.approvedPlayers ?? []).map((p: any) =>
    typeof p === "string" ? { _id: p, username: p } : p
  );

  const hostObj = typeof game?.host === "string" ? { _id: game?.host, username: getUsername(game?.host) } : game?.host;

  // If host is present in approvedPlayers we will keep them in approvedPlayers array
  // But in UI we show host separately and list other players below.
  const approvedPlayersExcludingHost = approvedPlayers.filter((p: any) => getId(p) !== getId(hostObj));

  const spotsLeft = (game?.playersNeeded?.max ?? 0) - (approvedPlayers.length ?? 0);
  const hasMinPlayers = (approvedPlayers.length ?? 0) >= (game?.playersNeeded?.min ?? 0);

  const statusColors: Record<string, string> = {
    Open: "bg-green-600/20 text-green-400 border-green-600/30",
    Full: "bg-yellow-600/20 text-yellow-400 border-yellow-600/30",
    Completed: "bg-blue-600/20 text-blue-400 border-blue-600/30",
    Cancelled: "bg-red-600/20 text-red-400 border-red-600/30",
  };

  const statusColor = statusColors[game?.status] ?? "bg-gray-600/20 text-gray-400 border-gray-600/30";

  const sportGradients: Record<string, string> = {
    cricket: "from-blue-600/70 via-blue-500/50 to-amber-400/30",
    football: "from-blue-600/70 via-indigo-500/50 to-purple-400/30",
    badminton: "from-purple-600/70 via-purple-500/50 to-fuchsia-400/30",
    tennis: "from-amber-600/70 via-yellow-500/50 to-orange-400/30",
    volleyball: "from-rose-600/70 via-pink-500/50 to-red-400/30",
    basketball: "from-orange-600/70 via-orange-500/50 to-amber-400/30",
    tabletennis: "from-teal-600/70 via-cyan-500/50 to-blue-400/30",
    swimming: "from-sky-600/70 via-cyan-500/50 to-blue-400/30",
    hockey: "from-slate-600/70 via-gray-500/50 to-zinc-400/30",
    kabaddi: "from-red-600/70 via-rose-500/50 to-pink-400/30",
  };

  const gradientClass = sportGradients[(game?.sport ?? "").toLowerCase()] ?? "from-primary/70 via-primary/50 to-primary/30";

  // render
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary"></div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h2 className="text-2xl font-bold text-foreground">Game not found</h2>
          <Button onClick={() => navigate("/games")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Games
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Banner */}
      <div className={`relative h-48 sm:h-56 md:h-64 bg-gradient-to-br ${gradientClass} overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>

        <div className="absolute inset-0 max-w-6xl mx-auto px-4 sm:px-6 flex flex-col justify-end pb-4 sm:pb-6">
          <div>
            <div className="flex items-start gap-3 mb-3">
              <div className="bg-white/20 backdrop-blur-md rounded-full p-2.5 sm:p-3 border border-white/30 flex-shrink-0">
                <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/40 text-white text-xs sm:text-sm font-bold tracking-wide inline-block mb-2">
                  {((game?.sport ?? "") as string).toUpperCase() || "GAME"}
                </div>
                <p className="text-base sm:text-lg md:text-xl text-white/90 drop-shadow-md font-normal line-clamp-2">
                  {game?.description ?? `Join us for an exciting ${game?.sport ?? "game"}!`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full border text-xs sm:text-sm font-bold backdrop-blur-md ${statusColor}`}>
                {game?.status}
              </div>
              {spotsLeft > 0 && spotsLeft <= 3 && game?.status === "Open" && (
                <div className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs sm:text-sm font-bold backdrop-blur-md">
                  Only {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl border backdrop-blur-md ${
              message.toLowerCase().includes("success")
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            <div className="flex items-center gap-2">
              {message.toLowerCase().includes("success") ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <div className="break-words">{message}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Game Info */}
            <div className="bg-card/60 border border-primary/20 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" /> Game Details
                </h2>
                <div className="text-sm text-muted-foreground">
                  {approvedPlayers.length}/{game?.playersNeeded?.max ?? 0} joined
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Date</div>
                    <div className="font-semibold text-foreground">{game?.slot?.date ? formatDate(game.slot.date) : "N/A"}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Time</div>
                    <div className="font-semibold text-foreground">
                      {game?.slot?.startTime && game?.slot?.endTime ? `${formatTime(game.slot.startTime)} - ${formatTime(game.slot.endTime)}` : "N/A"}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Venue</div>
                    <div className="font-semibold text-foreground">{game?.venue?.venueName ?? "N/A"}</div>
                    <div className="font-semibold text-foreground">{game?.subVenue?.name ?? "N/A"}</div>
                    <div className="text-xs text-muted-foreground">{game?.venue?.city ?? "N/A"}, {game?.venue?.state ?? ""}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <IndianRupee className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Cost Per Player</div>
                    <div className="font-semibold text-foreground text-lg">₹{formatPrice(game?.approxCostPerPlayer)}</div>
                    <div className="text-xs text-muted-foreground">Total: ₹{formatPrice(game?.slot?.price)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Host card */}
            <div className="bg-card/60 border border-primary/20 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" /> Host Information
              </h3>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center border border-primary/30">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="font-bold text-foreground">{getUsername(hostObj)}</div>
                  <div className="text-xs text-muted-foreground">Host of the game</div>
                </div>
              </div>
            </div>

            {/* Players list */}
            <div className="bg-card/60 border border-primary/20 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" /> Players
                </h3>
                <div className="text-sm text-muted-foreground">{approvedPlayers.length}/{game?.playersNeeded?.max ?? 0}</div>
              </div>

              {approvedPlayers.length === 0 ? (
                <div className="text-center text-muted-foreground py-6">No players joined yet</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Host shown first */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">H</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">{getUsername(hostObj)}</div>
                      <div className="text-xs text-muted-foreground">Host</div>
                    </div>
                  </div>

                  {/* Other approved players */}
                  {approvedPlayersExcludingHost.length === 0 ? (
                    <div className="col-span-full text-muted-foreground">No other players yet</div>
                  ) : (
                    approvedPlayersExcludingHost.map((p: any, idx: number) => (
                      <div key={getId(p) ?? idx} className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">{idx + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate">{getUsername(p)}</div>
                          <div className="text-xs text-muted-foreground">Player</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Pending Join Requests (Host only) */}
            {(() => {
              const pendingRequests = (game?.joinRequests ?? []).filter((r: any) => r?.status === "pending");
              console.log("Join Requests Debug:", {
                isHost,
                allRequests: game?.joinRequests,
                pendingRequests,
                pendingCount: pendingRequests.length,
                shouldShow: isHost && pendingRequests.length > 0
              });
              return null;
            })()}
            
            {isHost && (game?.joinRequests ?? []).filter((r: any) => r?.status === "pending").length > 0 && (
              <div className="bg-gradient-to-r from-card/80 to-card/60 border-2 border-primary/30 rounded-2xl p-6 shadow-xl backdrop-blur">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                    <UserPlus className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Pending Join Requests</h3>
                    <p className="text-sm text-muted-foreground">Review players wanting to join your game</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {(game.joinRequests ?? [])
                    .filter((r: any) => r?.status === "pending")
                    .map((req: any) => {
                      const requester = typeof req.user === "string" ? { _id: req.user, username: req.user } : req.user;
                      return (
                        <div key={getId(requester) ?? Math.random()} className="group relative p-4 rounded-xl bg-card/80 border border-primary/20 hover:border-primary/40 transition-all duration-200 hover:shadow-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border-2 border-primary/30">
                                <User className="w-6 h-6 text-primary" />
                              </div>
                              <div>
                                <div className="font-semibold text-foreground text-lg">{getUsername(requester)}</div>
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                  <UserPlus className="w-3 h-3" />
                                  Wants to join your game
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-3">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(requester)}
                                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 px-4 py-2 rounded-full hover:scale-105 active:scale-95"
                                disabled={actionLoading}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleReject(requester)}
                                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 px-4 py-2 rounded-full hover:scale-105 active:scale-95"
                                disabled={actionLoading}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Decline
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Right: Actions & rating */}
          <aside className="lg:col-span-1">
            <div className="space-y-6 lg:sticky lg:top-24">
              <div className="bg-gradient-to-br from-card/90 to-card/70 border-2 border-primary/30 rounded-2xl p-6 shadow-xl backdrop-blur">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-primary" />
                  </div>
                  <h4 className="text-lg font-bold text-foreground">Game Actions</h4>
                </div>

                {/* Not auth */}
                {!isAuthenticated && (
                  <Button
                    className="w-full button-style1 shadow-lg hover:shadow-xl transition-all duration-300 mb-4 py-3 text-lg font-semibold"
                    onClick={() => navigate("/login", { state: { from: `/games/${gameId}` } })}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Login to Join
                  </Button>
                )}

                {/* Authenticated */}
                {isAuthenticated && (
                  <>
                    {/* Payment button for host when min players met */}
                    {isHost && hasMinPlayers && game?.bookingStatus !== "Booked" && (
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700 text-white border-0 shadow-md mb-3 py-3 transition-all duration-200 hover:scale-105 active:scale-95"
                        disabled={actionLoading}
                        onClick={handleStartBooking}
                      >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay Now & Book Venue
                      </Button>
                    )}
                    {/* Host actions */}
                    {isHost && game?.status !== "Cancelled" && (
                      <Button
                        className="w-full bg-red-600 hover:bg-red-700 text-white mb-3 transition-all duration-200 hover:scale-105 active:scale-95"
                        onClick={handleCancelGame}
                        disabled={actionLoading}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancel Game
                      </Button>
                    )}

                    {/* Player actions */}
                    {!isHost && game?.status === "Open" && (
                      <>
                        {!hasPendingRequest && !isApprovedPlayer && (
                          <Button
                            className="w-full button-style1 shadow-md mb-3 transition-all duration-200 hover:scale-105 active:scale-95"
                            onClick={handleJoin}
                            disabled={actionLoading}
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Send Join Request
                          </Button>
                        )}

                        {hasPendingRequest && (
                          <Button
                            className="w-full button-style1 shadow-md mb-3 transition-all duration-200 hover:scale-105 active:scale-95"
                            onClick={handleCancelJoinRequest}
                            disabled={actionLoading}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Cancel Join Request
                          </Button>
                        )}

                        {isApprovedPlayer && (
                          <Button
                            className="w-full bg-red-600 hover:bg-red-700 text-white mb-3 transition-all duration-200 hover:scale-105 active:scale-95"
                            onClick={handleLeaveGame}
                            disabled={actionLoading}
                          >
                            <UserX className="w-4 h-4 mr-2" />
                            Leave Game
                          </Button>
                        )}
                      </>
                    )}

                    {/* Approved player tag */}
                    {!isHost && isApprovedPlayer && (
                      <div className="w-full rounded-xl bg-green-600/20 border border-green-600/30 text-green-400 rounded-lg px-4 py-2 mb-3 text-center font-semibold text-sm flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        You're In! 🎉
                      </div>
                    )}

                    <Button
                      variant={game?.status === "Completed" ? "default" : "outline"}
                      className={`w-full transition-all duration-200 hover:scale-105 active:scale-95 ${game?.status !== "Completed" ? "border-primary/30 hover:bg-primary/20 hover:text-white" : "button-style1 hover:text-white"}`}
                      onClick={() => navigate("/my-bookings")}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View My Games
                    </Button>
                  </>
                )}
              </div>

              {/* Rating (only for approved players after completion) */}
              {isAuthenticated && game?.status === "Completed" && isApprovedPlayer && (
                <div className="bg-card/80 border border-primary/20 rounded-xl p-6 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="w-5 h-5 text-primary" />
                    <h4 className="text-lg font-semibold text-foreground">Rate Venue</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">How was your experience?</p>

                  <div className="flex justify-center gap-2 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`p-2 transition-all duration-200 hover:scale-110 active:scale-95 ${
                          rating >= star
                            ? "text-yellow-500"
                            : "text-muted-foreground hover:text-yellow-400"
                        }`}
                      >
                        <Star className={`w-6 h-6 ${rating >= star ? "fill-current" : ""}`} />
                      </button>
                    ))}
                  </div>

                  <Button 
                    className="w-full button-style1 transition-all duration-200 hover:scale-105 active:scale-95" 
                    onClick={handleRating} 
                    disabled={rating === 0 || actionLoading}
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Submit Rating
                  </Button>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default GameDetails;

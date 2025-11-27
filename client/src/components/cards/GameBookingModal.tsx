import React, { useState } from "react";
import { X, Calendar, Clock, MapPin, Users, Star, IndianRupee } from "lucide-react";
import { Game } from "../../types";
import { Button } from "../ui/button";
interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;

  game: Game;
  currentUser: any;

  // action handlers passed from MyBookings
  onApprovePlayer: (gameId: string, playerId: string) => Promise<void>;
  onRejectPlayer: (gameId: string, playerId: string) => Promise<void>;
//   onCreateJoinRequest: (gameId: string) => Promise<void>;
  onCancelJoinRequest: (gameId: string) => Promise<void>;
  onLeaveGame: (gameId: string) => Promise<void>;
  onStartGameBooking: (gameId: string) => Promise<void>;
  onCompleteGame: (gameId: string) => Promise<void>;
  onRateVenue: (gameId: string, rating: number) => Promise<void>;
}

export default function GameBookingModal({
  open,
  onOpenChange,
  game,
  currentUser,
  onApprovePlayer,
  onRejectPlayer,
//   onCreateJoinRequest,
  onCancelJoinRequest,
  onLeaveGame,
  onStartGameBooking,
  onCompleteGame,
  onRateVenue,
}: Props) {
  const [rating, setRating] = useState<number>(0);
  const isHost = typeof game.host === "string" 
    ? game.host === currentUser?.id 
    : game.host._id === currentUser?.id;

  const start = new Date(game.slot.startTime);
  const end = new Date(game.slot.endTime);
  const now = new Date();

  const hasGameEnded = end < now;
  const isPaid = game.bookingStatus === "Booked";

  // Player join-related logic
  const userJoinRequest = game.joinRequests?.find((jr) => jr.user === currentUser?.id);
  const isApprovedPlayer = (game.approvedPlayers || []).includes(currentUser?.id);

  // Payment ready?
  const canStartPayment =
    isHost &&
    (game.approvedPlayers?.length || 0) >= game.playersNeeded.min &&
    game.bookingStatus !== "Booked" &&
    game.status !== "Completed";

  // Completion allowed?
  const canCompleteGame = isHost && hasGameEnded && game.status !== "Completed";

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="bg-card/95 backdrop-blur-xl rounded-2xl border border-primary/30 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-primary/20 to-primary/10 backdrop-blur-xl border-b border-primary/20 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground capitalize">
                {game.sport} Game
              </h2>
              <p className="text-sm text-muted-foreground">{game.venue.venueName}</p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-primary/20 rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Game Summary Section */}
        <div className="p-6 space-y-6">
          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
              game.status === "Open" ? "bg-green-600/20 text-green-400" :
              game.status === "Full" ? "bg-blue-600/20 text-blue-400" :
              game.status === "Completed" ? "bg-purple-600/20 text-purple-400" :
              "bg-red-600/20 text-red-400"
            }`}>
              {game.status}
            </span>
            {isPaid && (
              <span className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-orange-600/20 text-orange-400">
                Payment Complete
              </span>
            )}
            {isHost && (
              <span className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-primary/20 text-primary">
                You're the Host
              </span>
            )}
          </div>

          {/* Game Description */}
          {game.description && (
            <div className="bg-muted/20 rounded-xl p-4 border border-primary/10">
              <p className="text-foreground">{game.description}</p>
            </div>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Venue */}
            <div className="bg-primary/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-primary mb-1">
                <MapPin className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Location</span>
              </div>
              <p className="text-foreground font-semibold">{game.venue.venueName}</p>
              <p className="text-sm text-muted-foreground">{game.venue.city}</p>
            </div>

            {/* Date */}
            <div className="bg-blue-600/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-400 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Date</span>
              </div>
              <p className="text-foreground font-semibold">
                {start.toLocaleDateString("en-IN", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            {/* Time */}
            <div className="bg-purple-600/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-purple-400 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Time</span>
              </div>
              <p className="text-foreground font-semibold">
                {start.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {" - "}
                {end.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            {/* Players */}
            <div className="bg-green-600/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-400 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Players</span>
              </div>
              <p className="text-foreground font-semibold">
                {game.approvedPlayers.length}/{game.playersNeeded.max}
              </p>
              <p className="text-sm text-muted-foreground">Min: {game.playersNeeded.min}</p>
            </div>

            {/* Cost */}
            <div className="bg-orange-600/10 rounded-xl p-4 md:col-span-2">
              <div className="flex items-center gap-2 text-orange-400 mb-1">
                <IndianRupee className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Cost Per Player</span>
              </div>
              <p className="text-foreground font-semibold text-lg">₹{Number(game.approxCostPerPlayer).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>

        {/* HOST — Pending Join Requests */}
        {isHost && game.joinRequests?.filter((jr) => jr.status === "pending").length > 0 && (
          <div className="bg-yellow-600/10 rounded-xl p-5 border border-yellow-600/20">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-yellow-400" />
              Pending Join Requests ({game.joinRequests.filter((jr) => jr.status === "pending").length})
            </h3>
            <div className="space-y-3">
              {game.joinRequests
                ?.filter((jr) => jr.status === "pending")
                .map((jr) => {
                  const userId = typeof jr.user === "string" ? jr.user : jr.user._id;
                  const username = typeof jr.user === "string" ? null : jr.user.username;
                  
                  return (
                    <div
                      key={userId}
                      className="bg-card/50 backdrop-blur rounded-lg p-4 flex items-center justify-between border border-primary/10"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-foreground font-medium">
                            {username || "Player"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {username ? `ID: ${userId.substring(0, 8)}...` : `ID: ${userId.substring(0, 8)}...`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
                          onClick={() => onApprovePlayer(game._id, userId)}
                        >
                          Approve
                        </Button>
                        <Button
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2"
                          onClick={() => onRejectPlayer(game._id, userId)}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* PLAYER — Action Buttons */}
        {!isHost && (
          <div className="space-y-3">
            {/* Cancel join request */}
            {userJoinRequest?.status === "pending" && (
              <div className="bg-yellow-600/10 rounded-xl p-4 border border-yellow-600/20">
                <p className="text-sm text-muted-foreground mb-3">Your join request is pending approval</p>
                <Button
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3"
                  onClick={() => onCancelJoinRequest(game._id)}
                >
                  Cancel Request
                </Button>
              </div>
            )}

            {/* Leave game */}
            {isApprovedPlayer && (
              <div className="bg-green-600/10 rounded-xl p-4 border border-green-600/20">
                <p className="text-sm text-green-400 mb-3 font-medium">✓ You're approved for this game</p>
                <Button
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3"
                  onClick={() => onLeaveGame(game._id)}
                >
                  Leave Game
                </Button>
              </div>
            )}

            {/* Rating after completion */}
            {game.status === "Completed" && (
              <div className="bg-purple-600/10 rounded-xl p-5 border border-purple-600/20">
                <p className="text-center text-foreground font-semibold mb-3">Rate Your Experience</p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={`w-8 h-8 cursor-pointer transition-all hover:scale-110 ${
                        rating >= i ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"
                      }`}
                      onClick={() => {
                        setRating(i);
                        onRateVenue(game._id, i);
                      }}
                    />
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-center text-sm text-muted-foreground mt-2">
                    You rated {rating} star{rating > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* HOST — Payment */}
        {isHost && canStartPayment && (
          <div className="bg-gradient-to-r from-orange-600/20 to-orange-500/20 rounded-xl p-5 border border-orange-600/30">
            <div className="flex items-center gap-2 mb-3">
              <IndianRupee className="w-5 h-5 text-orange-400" />
              <h3 className="text-lg font-semibold text-foreground">Ready for Payment</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Minimum players met. Pay now to confirm the venue booking.
            </p>
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 font-semibold"
              onClick={() => onStartGameBooking(game._id)}
            >
              Pay ₹{Number(game.approxCostPerPlayer).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} & Book Venue
            </Button>
          </div>
        )}

        {/* HOST — Complete Game */}
        {isHost && canCompleteGame && (
          <div className="bg-gradient-to-r from-blue-600/20 to-blue-500/20 rounded-xl p-5 border border-blue-600/30">
            <h3 className="text-lg font-semibold text-foreground mb-3">Game Ended</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Mark this game as completed to finalize the session.
            </p>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 font-semibold"
              onClick={() => onCompleteGame(game._id)}
            >
              Mark as Completed
            </Button>
          </div>
        )}

        {/* Calendar feature removed */}

        {/* Close Button */}
        <div className="border-t border-primary/10 pt-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full hover:bg-primary/10 py-3"
          >
            Close
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
}

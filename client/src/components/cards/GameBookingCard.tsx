import React from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, MapPin, Users, IndianRupee, Clock, Trophy } from "lucide-react";
import { Game } from "../../types";

interface Props {
  game: Game;
  onClick?: () => void;
  isHost?: boolean;
}

export default function GameCard({ game, onClick, isHost = false }: Props) {
  const start = new Date(game.slot.startTime);
  const end = new Date(game.slot.endTime);
  const isPaid = game.bookingStatus === "Booked";
  const now = new Date();
  const isUpcoming = start > now;
  const hasEnded = end < now;
  const navigate = useNavigate();

  return (
    <div
      onClick={onClick}
      className="group bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border border-primary/20 rounded-2xl p-6 hover:border-primary/50 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-primary/10 hover:scale-[1.02]"
    >
      {/* Header Section */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/10 transition-all">
            <Trophy className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold capitalize text-foreground">{game.sport}</h3>
            <p className="text-sm text-muted-foreground">{game.subVenue?.name || "Standard Court"}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 items-end">
          <span
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide ${
              game.status === "Completed"
                ? "bg-purple-600/20 text-purple-400 border border-purple-600/30"
                : game.status === "Cancelled"
                ? "bg-red-600/20 text-red-400 border border-red-600/30"
                : game.status === "Full"
                ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                : "bg-green-600/20 text-green-400 border border-green-600/30"
            }`}
          >
            {game.status}
          </span>
          {isHost && (
            <span className="px-2 py-1 rounded-md text-xs font-semibold bg-primary/20 text-primary">
              Host
            </span>
          )}
          {isPaid && (
            <span className="px-2 py-1 rounded-md text-xs font-semibold bg-orange-600/20 text-orange-400">
              Paid
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {game.description && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {game.description}
        </p>
      )}

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Venue */}
        <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase">Location</span>
          </div>
          <p className="text-sm font-semibold text-foreground truncate">{game.venue.venueName}</p>
          <p className="text-xs text-muted-foreground">{game.venue.city}</p>
        </div>

        {/* Date & Time */}
        <div className="bg-blue-600/5 rounded-lg p-3 border border-blue-600/10">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-medium text-muted-foreground uppercase">Schedule</span>
          </div>
          <p className="text-sm font-semibold text-foreground">
            {start.toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
            })}
          </p>
          <p className="text-xs text-muted-foreground">
            {start.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {/* Players */}
        <div className="bg-green-600/5 rounded-lg p-3 border border-green-600/10">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs font-medium text-muted-foreground uppercase">Players</span>
          </div>
          <p className="text-sm font-semibold text-foreground">
            {game.approvedPlayers.length}/{game.playersNeeded.max}
          </p>
          <p className="text-xs text-muted-foreground">Min: {game.playersNeeded.min}</p>
        </div>

        {/* Cost */}
        <div className="bg-orange-600/5 rounded-lg p-3 border border-orange-600/10">
          <div className="flex items-center gap-2 mb-1">
            <IndianRupee className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-xs font-medium text-muted-foreground uppercase">Cost</span>
          </div>
          <p className="text-sm font-semibold text-foreground">
            ₹{Number(game.approxCostPerPlayer).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground">per player</p>
        </div>
      </div>

      {/* Footer - Time Status */}
      <div className="pt-3 border-t border-primary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {hasEnded ? "Ended" : isUpcoming ? "Upcoming" : "In Progress"}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/games/${game._id}`);
            }}
            className="text-xs text-primary font-medium group-hover:underline"
            aria-label={`View details for ${game.sport}`}
          >
            View Details →
          </button>
        </div>
      </div>
    </div>
  );
}

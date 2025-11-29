import React from "react";
import { Calendar, MapPin, Users, Clock, IndianRupee, Trophy, UserPlus, Eye } from "lucide-react";
import { Button } from "../ui/button";
import type { Game } from "../../types/index";

interface GameCardProps {
  game: Game;
  onOpen: (id: string) => void;
  onJoin?: (gameId: string) => void;
  onOptimisticUpdate?: (gameId: string, patch: any) => void;
}

function GameCard({ game, onOpen, onJoin, onOptimisticUpdate }: GameCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatPricePerPlayer = (value: number) => {
    if (!Number.isFinite(value)) return "-";
    return value.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const statusColors = {
    Open: "bg-green-600/20 text-green-400 border-green-600/30",
    Full: "bg-yellow-600/20 text-yellow-400 border-yellow-600/30",
    Completed: "bg-blue-600/20 text-blue-400 border-blue-600/30",
    Cancelled: "bg-red-600/20 text-red-400 border-red-600/30",
  };

  const statusColor = statusColors[game.status] || "bg-gray-600/20 text-gray-400 border-gray-600/30";

  // Calculate spots left
  const spotsLeft = game.playersNeeded.max - game.approvedPlayers.length;
  const isFull = spotsLeft === 0;
  const isOpen = game.status === "Open" && !isFull;

  // Sport gradient backgrounds - lighter gradients for better text visibility
  const sportGradients: Record<string, string> = {
    cricket: "from-indigo-600/70 via-blue-500/50 to-cyan-400/30",
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

  const gradientClass = sportGradients[game.sport.toLowerCase()] || "from-primary/70 via-primary/50 to-primary/30";

  return (
    <div
      className="group relative overflow-hidden rounded-xl border-2 border-primary/20 hover:border-primary transition-all cursor-pointer hover:shadow-lg shadow-sm bg-card/80 backdrop-blur"
      onClick={() => onOpen(game._id)}
    >
      {/* Header Image/Gradient */}
      <div className={`relative h-48 overflow-hidden bg-gradient-to-br ${gradientClass}`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
        
        {/* Sport Icon */}
        <div className="absolute top-3 left-3">
          <div className="bg-white/20 backdrop-blur-md rounded-full p-3 border border-white/30">
            <Trophy className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <div className={`px-3 py-1.5 rounded-full border text-xs font-bold backdrop-blur-md ${statusColor}`}>
            {game.status}
          </div>
        </div>

        {/* Game Name & Sport */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-semibold mb-2">
            {game.sport}
          </div>
          <h3 className="text-xl font-bold text-white drop-shadow-lg line-clamp-2">
            {game.description || `Friendly ${game.sport} Match`}
          </h3>
        </div>
      </div>

      <div className="p-5 flex flex-1 flex-col gap-4">
        <div className="space-y-4">
          {/* Location */}
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="truncate flex-1 min-w-0">
              {game.venue.venueName ? `${game.venue.venueName} • ` : ""}
              {game.subVenue.name}, {game.venue.city}
              {game.venue.state && `, ${game.venue.state}`}
            </span>
          </div>

          {/* Date & Time */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4 text-primary" />
              <span>{formatDate(game.slot.date)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4 text-primary" />
              <span>{formatTime(game.slot.startTime)} - {formatTime(game.slot.endTime)}</span>
            </div>
          </div>

          {/* Players Progress */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Players Joined</span>
              </div>
              <span className="font-semibold text-foreground">
                {game.approvedPlayers.length}/{game.playersNeeded.max}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  isFull ? 'bg-yellow-500' : 'bg-primary'
                }`}
                style={{ width: `${(game.approvedPlayers.length / game.playersNeeded.max) * 100}%` }}
              ></div>
            </div>
            
            <div className="min-h-[1rem]">
              {spotsLeft > 0 && spotsLeft <= 3 && (
                <p className="text-xs text-yellow-500 font-semibold">
                  Only {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left!
                </p>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-primary/10">
            <div className="flex items-center gap-2 text-primary font-bold text-lg">
              <IndianRupee className="h-5 w-5" />
              <span>{formatPricePerPlayer(game.approxCostPerPlayer)}</span>
              <span className="text-sm text-muted-foreground font-normal">
                /player
              </span>
            </div>
            
            {game.playersNeeded.min > game.approvedPlayers.length && (
              <div className="text-xs text-muted-foreground">
                Min {game.playersNeeded.min} required
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-auto flex gap-2 pt-2">
          {isOpen && onJoin ? (
            <>
              <Button
                className="flex-1 button-style1 shadow-sm hover:shadow-md transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  onJoin(game._id);
                }}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Join Now
              </Button>
              <Button
                variant="secondary"
                className="shadow-sm hover:shadow-md transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(game._id);
                }}
              >
                <Eye className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button
              className="w-full button-style1 shadow-sm hover:shadow-md transition-all"
              onClick={(e) => {
                e.stopPropagation();
                onOpen(game._id);
              }}
            >
              View Details
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default GameCard;

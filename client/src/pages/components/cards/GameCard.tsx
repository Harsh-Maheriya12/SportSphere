import React from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin, Users2 } from "lucide-react";
import { Button } from "../ui/button";

interface Game {
  id: string;
  title: string;
  sport: string;
  date: string;
  venue: string;
  players: number;
  level: string;
  image?: string;
}

function GameCard({
  id,
  title,
  sport,
  date,
  venue,
  players,
  level,
  image,
}: Game) {
  return (
    <div
      key={id}
      className="group relative overflow-hidden rounded-xl border border-primary/20 hover:border-primary/60 transition-all p-6 bg-gradient-to-br from-primary/5 to-background"
    >
      {/* Sport */}
      <div className="mb-4">
        <div className="inline-block px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-semibold">
          {sport}
        </div>
      </div>

      {/* Name */}
      <h3 className="text-xl font-bold mb-4 text-primary">{title}</h3>

      {/* Other Info */}
      <div className="space-y-3 mb-6">
        {/* Date */}
        <div className="flex items-center gap-3 text-muted-foreground">
          <Calendar className="w-5 h-5 text-primary" />
          <span className="text-sm">{date}</span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-3 text-muted-foreground">
          <MapPin className="w-5 h-5 text-primary" />
          <span className="text-sm">{venue}</span>
        </div>

        {/* Players Joined */}
        <div className="flex items-center gap-3 text-muted-foreground">
          <Users2 className="w-5 h-5 text-primary" />
          <span className="text-sm">{players} players joined</span>
        </div>

        {/* Expertise */}
        <div className="flex items-center gap-3">
          <div className="px-2 py-1 rounded bg-primary/20 border border-primary/30 text-primary text-xs font-semibold">
            {level}
          </div>
        </div>
      </div>

      {/* This have to be updated */}
      <Link to="/games">
        <Button className="button-style1">
          Join Game
        </Button>
      </Link>
    </div>
  );
}

export default GameCard;

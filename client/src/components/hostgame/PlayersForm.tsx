import React from "react";
import { Users } from "lucide-react";

interface PlayersFormProps {
  minPlayers: number | "";
  maxPlayers: number | "";
  setMin: (v: number | "") => void;
  setMax: (v: number | "") => void;
  description: string;
  setDescription: (s: string) => void;
  sportObj?: any; // { minPlayers, maxPlayers, name }
  slotPrice?: number | null;
  sport?: string;
}

const PlayersForm: React.FC<PlayersFormProps> = ({
  minPlayers,
  maxPlayers,
  setMin,
  setMax,
  description,
  setDescription,
  sportObj,
  slotPrice,
  sport
}) => {
  const approxCost =
    slotPrice && maxPlayers
      ? Math.ceil(slotPrice / Number(maxPlayers))
      : null;

  return (
    <div className="space-y-5 bg-gradient-to-br from-card/80 to-primary/5 backdrop-blur-md p-5 rounded-xl border-2 border-primary/20">
      
      {/* Player Count Inputs */}
      <div>
        <label className="block text-foreground mb-2 font-semibold flex items-center gap-2">
          <span className="w-2 h-2 bg-primary rounded-full"></span>
          Number of Players *
        </label>

        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            placeholder="Min"
            value={minPlayers as any}
            onChange={(e) =>
              setMin(e.target.value === "" ? "" : Number(e.target.value))
            }
            min={1}
            className="p-3 rounded-xl bg-card/80 backdrop-blur border-2 border-primary/20 hover:border-primary/40 text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all"
          />

          <input
            type="number"
            placeholder="Max"
            value={maxPlayers as any}
            onChange={(e) =>
              setMax(e.target.value === "" ? "" : Number(e.target.value))
            }
            min={1}
            className="p-3 rounded-xl bg-card/80 backdrop-blur border-2 border-primary/20 hover:border-primary/40 text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all"
          />
        </div>

        {sportObj && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Users className="w-3 h-3" />
            Allowed: {sportObj.minPlayers} – {sportObj.maxPlayers} players
          </p>
        )}
      </div>

      {/* Approx Cost */}
      {approxCost && (
        <div className="p-4 rounded-lg bg-gradient-to-br from-green-600/10 to-transparent border border-green-600/30">
          <p className="text-xs text-muted-foreground">Approx. Cost Per Player</p>
          <p className="text-3xl font-bold text-foreground">₹{approxCost}</p>

          {slotPrice && (
            <p className="text-xs text-muted-foreground mt-1">
              Slot price ₹{slotPrice} ÷ {maxPlayers} players
            </p>
          )}
        </div>
      )}

      {/* Description */}
      <div>
        <label className="block text-foreground mb-2 font-semibold flex items-center gap-2">
          <span className="w-2 h-2 bg-primary rounded-full"></span>
          Game Description
        </label>
        <textarea
          placeholder="Describe your match, rules, meeting point..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-3 rounded-xl bg-card/80 backdrop-blur border-2 border-primary/20 hover:border-primary/40 text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all"
          rows={3}
        />
      </div>
    </div>
  );
};

export default PlayersForm;

import React from "react";
import { Users, Check } from "lucide-react";

interface SubVenueListProps {
  subVenues: any[];
  selectedId?: string;
  onSelect: (subVenue: any) => void;
  sport?: string;
}

const SubVenueList: React.FC<SubVenueListProps> = ({
  subVenues,
  selectedId,
  onSelect,
  sport,
}) => {
  if (!subVenues || subVenues.length === 0)
    return (
      <div className="bg-gradient-to-br from-card/80 to-primary/5 backdrop-blur-md rounded-xl border-2 border-dashed border-primary/30 p-6 text-center">
        <p className="text-foreground font-medium">
          No courts/fields available for {sport || "this sport"}
        </p>
      </div>
    );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {subVenues.map((sv) => {
        const rules = sv.sports?.find((s: any) => s.name === sport);

        return (
          <button
            key={sv._id}
            onClick={() => onSelect(sv)}
            className={`group p-4 text-left rounded-xl border-2 transition-all shadow-sm hover:shadow-md ${
              selectedId === sv._id
                ? "border-primary bg-gradient-to-br from-primary/20 to-primary/5"
                : "border-primary/20 bg-gradient-to-br from-card/80 to-primary/5 hover:border-primary/40"
            } backdrop-blur`}
          >
            <div className="flex items-start justify-between">
              <div className="font-medium text-foreground">{sv.name}</div>
              {selectedId === sv._id && <Check className="w-5 h-5 text-primary" />}
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
              <Users className="w-3 h-3" />
              {rules ? (
                <>
                  {rules.minPlayers}–{rules.maxPlayers} players
                </>
              ) : (
                <>Players:</>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default SubVenueList;

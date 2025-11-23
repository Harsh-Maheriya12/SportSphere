import React from "react";
import { MapPin, Check } from "lucide-react";

interface VenueSearchProps {
  venues: any[];
  loading: boolean;
  onSelect: (venue: any) => void;
  selectedId?: string;
  sport?: string;
}

const VenueSearch: React.FC<VenueSearchProps> = ({
  venues,
  loading,
  onSelect,
  selectedId,
  sport,
}) => {
  if (loading)
    return (
      <div className="bg-gradient-to-br from-card/80 to-primary/5 backdrop-blur-md rounded-xl border border-primary/20 p-8 text-center">
        <div className="inline-block p-3 bg-primary/20 rounded-full mb-3 animate-pulse">
          <MapPin className="w-8 h-8 text-primary" />
        </div>
        <p className="text-foreground">Loading venues...</p>
      </div>
    );

  if (!venues || venues.length === 0)
    return (
      <div className="bg-gradient-to-br from-card/80 to-primary/5 backdrop-blur-md rounded-xl border-2 border-dashed border-primary/30 p-8 text-center">
        <MapPin className="w-12 h-12 text-primary/50 mx-auto mb-3" />
        <p className="text-foreground">No venues found for {sport || "this sport"}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Try selecting a different sport or check back later
        </p>
      </div>
    );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {venues.map((v) => (
        <div
          key={v._id}
          onClick={() => onSelect(v)}
          className={`group relative overflow-hidden rounded-xl border-2 cursor-pointer transition-all shadow-md hover:shadow-xl ${
            selectedId === v._id
              ? "border-primary bg-gradient-to-br from-primary/20 to-primary/5"
              : "border-primary/20 bg-gradient-to-br from-card/80 to-primary/5 hover:border-primary/40"
          } backdrop-blur`}
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-20 h-16 rounded-lg overflow-hidden border border-primary/20">
                <img
                  src={v.images?.[0] || "/placeholder-venue.png"}
                  alt={v.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1">
                <div className="font-semibold text-foreground flex items-center gap-2">
                  {v.name}
                  {selectedId === v._id && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </div>

                <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" />
                  {v.city}
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {(v.sports || []).slice(0, 3).map((s: any, i: number) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full"
                    >
                      {typeof s === "string" ? s : s.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VenueSearch;

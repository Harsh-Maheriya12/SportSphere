import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import GameCard from "../components/cards/GameCard";
import { apiGetGames } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useGamesSocket } from "../hooks/useGamesSocket";
import type { Game as GameType } from "../types/index";
import { Button } from "../components/ui/button";
import { Plus, Filter, X, SlidersHorizontal } from "lucide-react";
import { SportsEnum } from "../constants/SportsEnum";

const perPageDefault = 12;

// Geocoding helper  - Implementation for city to coordinates mapping - added later

const GamesListing: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // Primary filters state
  const [sport, setSport] = useState("");
  const [city, setCity] = useState("");
  const [venueName, setVenueName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Advanced filters state (for modal)
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [preferredTimeSlot, setPreferredTimeSlot] = useState("");

  // UI state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [games, setGames] = useState<GameType[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage] = useState(perPageDefault);
  const [total, setTotal] = useState<number | null>(null);

  // Geocoding commented out for now
  // useEffect(() => {
  //   // City geocoding logic will go here
  // }, [city]);

  // Build filters object matching backend query params
  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (sport) f.sport = sport;
    const trimmedCity = city.trim();
    if (trimmedCity) f.city = trimmedCity;
    const trimmedVenueName = venueName.trim();
    if (trimmedVenueName) f.venueName = trimmedVenueName;
    if (startDate) f.startDate = startDate;
    if (endDate) f.endDate = endDate;
    if (minPrice) f.minPrice = minPrice;
    if (maxPrice) f.maxPrice = maxPrice;
    return f;
  }, [sport, city, venueName, startDate, endDate, minPrice, maxPrice]);

  // Load games
  const loadGames = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGetGames(filters);
      const payload = (res as any).games ?? (res as any).game ?? [];
      setTotal(payload.length);
      const start = (page - 1) * perPage;
      setGames(payload.slice(start, start + perPage));
    } catch (err: any) {
      console.error("games load", err);
      setGames([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters, page, perPage]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  // Trigger initial and subsequent loads
  useEffect(() => {
    loadGames();
  }, [loadGames]);

  // Socket updates
  useGamesSocket({
    onGameCreated: (newGame: any) => {
      setGames((prev) => [newGame, ...prev].slice(0, perPage));
      setTotal((t) => (t ? t + 1 : null));
    },
    onGameUpdated: (upd: any) => {
      setGames((prev) => prev.map((g) => (g._id === upd._id ? { ...g, ...upd } : g)));
    },
    onGameDeleted: (id: string) => {
      setGames((prev) => prev.filter((g) => g._id !== id));
      setTotal((t) => (t ? t - 1 : null));
    },
  });

  const handleHostGame = () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/host-game" } });
      return;
    }
    if (user?.role !== "player") {
      return;
    }
    navigate("/host-game");
  };

  const handleGameClick = (id: string) => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `/games/${id}` } });
      return;
    }
    navigate(`/games/${id}`);
  };

  const handleClearFilters = () => {
    setSport("");
    setCity("");
    setVenueName("");
    setStartDate("");
    setEndDate("");
    setMinPrice("");
    setMaxPrice("");
    setPreferredTimeSlot("");
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (sport) count++;
    if (city) count++;
    if (startDate) count++;
    if (endDate) count++;
    if (minPrice) count++;
    if (maxPrice) count++;
    if (preferredTimeSlot) count++;
    if (venueName) count++;
    return count;
  }, [sport, city, venueName, startDate, endDate, minPrice, maxPrice, preferredTimeSlot]);

  const totalPages = useMemo(() => (total ? Math.max(1, Math.ceil(total / perPage)) : 1), [total, perPage]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-background border-b border-primary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Available Games</h1>
              <p className="text-muted-foreground">Join exciting games in your area</p>
            </div>
            {user?.role === "player" && (
              <Button
                onClick={handleHostGame}
                className="button-style1 shadow-md active:scale-95 transition-all duration-300 ease-linear w-full sm:w-auto"
              >
                <Plus className="w-5 h-5 mr-2" />
                Host a Game
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filters Section - Responsive */}
      <div className="bg-card/50 backdrop-blur-sm border-b border-primary/10 sticky top-0 z-10 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 overflow-x-hidden">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Filters</h2>
              {activeFiltersCount > 0 && (
                <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(true)}
                className="border-primary/30 hover:bg-primary/10 text-xs"
              >
                <SlidersHorizontal className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Advanced</span>
              </Button>
              {activeFiltersCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="border-red-500/30 hover:bg-red-500/10 text-xs text-red-500"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Basic Filters - Always Visible */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full">
            {/* Sport Filter */}
            <div className="w-full min-w-0">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Sport</label>
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-primary/20 text-foreground text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
              >
                <option value="">All Sports</option>
                {Object.values(SportsEnum).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* City Filter */}
            <div className="w-full min-w-0">
              <label className="block text-xs font-medium text-muted-foreground mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Enter city name"
                className="w-full px-3 py-2 rounded-lg bg-background border border-primary/20 text-foreground text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
              />
            </div>

            <div className="w-full min-w-0">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Venue Name</label>
              <input
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="Search venue"
                className="w-full px-3 py-2 rounded-lg bg-background border border-primary/20 text-foreground text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
              />
            </div>

            {/* Start Date Filter */}
            <div className="w-full min-w-0 relative z-20">
              <label htmlFor="start-date-filter" className="block text-xs font-medium text-muted-foreground mb-1">Start Date</label>
              <input
                id="start-date-filter"
                type="date"
                value={startDate}
                onChange={(e) => {
                  console.log("Start date changed:", e.target.value);
                  setStartDate(e.target.value);
                }}
                min={new Date().toISOString().split("T")[0]}
                style={{ colorScheme: 'dark' }}
                className="w-full px-3 py-2 rounded-lg bg-background border border-primary/20 text-foreground text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none cursor-pointer box-border relative z-20"
              />
            </div>

            {/* End Date Filter */}
            <div className="w-full min-w-0 relative z-20">
              <label htmlFor="end-date-filter" className="block text-xs font-medium text-muted-foreground mb-1">End Date</label>
              <input
                id="end-date-filter"
                type="date"
                value={endDate}
                onChange={(e) => {
                  console.log("End date changed:", e.target.value);
                  setEndDate(e.target.value);
                }}
                min={startDate || new Date().toISOString().split("T")[0]}
                disabled={!startDate}
                style={{ colorScheme: 'dark' }}
                className="w-full px-3 py-2 rounded-lg bg-background border border-primary/20 text-foreground text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none cursor-pointer box-border disabled:opacity-50 disabled:cursor-not-allowed relative z-20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters Modal */}
      {showAdvancedFilters && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border-2 border-primary/20 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-card border-b border-primary/20 p-4 sm:p-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">Advanced Filters</h2>
                <p className="text-sm text-muted-foreground">Refine your search with more options</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(false)}
                className="border-primary/30 hover:bg-primary/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Price Range (₹)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Min Price</label>
                    <input
                      type="number"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-lg bg-background border border-primary/20 text-foreground text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Max Price</label>
                    <input
                      type="number"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="5000"
                      className="w-full px-3 py-2 rounded-lg bg-background border border-primary/20 text-foreground text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Preferred Time Slot</h3>
                <select
                  value={preferredTimeSlot}
                  onChange={(e) => setPreferredTimeSlot(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-primary/20 text-foreground text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                >
                  <option value="">All Time Slots</option>
                  <option value="morning">Morning (6 AM - 12 PM)</option>
                  <option value="afternoon">Afternoon (12 PM - 5 PM)</option>
                  <option value="evening">Evening (5 PM - 9 PM)</option>
                  <option value="night">Night (9 PM - 12 AM)</option>
                </select>
              </div>
            </div>

            <div className="sticky bottom-0 bg-card border-t border-primary/20 p-4 sm:p-6 flex gap-3">
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="flex-1 border-red-500/30 hover:bg-red-500/10 text-red-500"
              >
                Clear All
              </Button>
              <Button onClick={() => setShowAdvancedFilters(false)} className="flex-1 button-style1 shadow-md">
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Games Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary"></div>
          </div>
        )}

        {!loading && games.length === 0 && (
          <div className="text-center py-20">
            <div className="bg-muted/10 rounded-xl p-8 max-w-md mx-auto">
              <h3 className="text-xl font-semibold mb-2">No games found</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your filters or host a new game</p>
              <Button onClick={handleHostGame} className="button-style1">
                <Plus className="w-4 h-4 mr-2" />
                Host a Game
              </Button>
            </div>
          </div>
        )}

        {!loading && games.length > 0 && (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              Showing {games.length} of {total ?? 0} games
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {games.map((game) => (
                <div key={game._id} onClick={() => handleGameClick(game._id)} className="cursor-pointer">
                  <GameCard game={game} onOpen={handleGameClick} />
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-8">
                <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="border-primary/30 hover:bg-primary/10">
                  Previous
                </Button>
                <div className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="border-primary/30 hover:bg-primary/10">
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GamesListing;


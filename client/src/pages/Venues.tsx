import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiGetAllVenues, apiGetSubVenuesByVenue, apiGetSlotsForSubVenue } from "../services/api";
import { Venue } from "../types";
import VenueCard from "../components/cards/VenueCard";
import { Search, Filter, X, MapPin, DollarSign } from "lucide-react";
import { Button } from "../components/ui/button";

// Extended venue type to include price info
interface VenueWithPrice extends Venue {
  minPrice?: number;
  maxPrice?: number;
  hasAvailableSlots?: boolean;
}

function Venues() {
  const [searchQuery, setSearchQuery] = useState("");
  const [venues, setVenues] = useState<VenueWithPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [selectedSport, setSelectedSport] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const sports = ["Football", "Cricket", "Basketball", "Tennis", "Badminton", "Volleyball", "Swimming", "Hockey", "Kabaddi", "Table Tennis"];

  useEffect(() => {
    fetchAllVenues();
  }, []);

  const fetchAllVenues = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await apiGetAllVenues();
      
      // Get date range: today + next 7 days to find all available slots
      const dates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }
      
      // Fetch subvenues and their slots for each venue to get actual available prices
      const venuesWithPrices = await Promise.all(
        response.venues.map(async (venue) => {
          try {
            const subVenueResponse = await apiGetSubVenuesByVenue(venue._id);
            const subVenues = subVenueResponse.subVenues || [];
            
            // Fetch slots for each subvenue and extract prices from available slots
            const allPrices: number[] = [];
            let hasAnyAvailableSlots = false;
            
            for (const subVenue of subVenues) {
              // Try multiple dates to find available slots
              for (const date of dates) {
                try {
                  const slotsResponse = await apiGetSlotsForSubVenue(subVenue._id, date);
                  // API returns either { timeSlot: {...} } or { slots: [] }
                  const slots = slotsResponse.timeSlot?.slots || slotsResponse.slots || [];
                  
                  // Extract prices from available slots only
                  slots.forEach((slot: any) => {
                    if (slot.status === "available" && slot.prices) {
                      hasAnyAvailableSlots = true;
                      // slot.prices is an object like { "hockey": 999, "football": 1200 }
                      Object.values(slot.prices).forEach((price: any) => {
                        if (typeof price === 'number') {
                          allPrices.push(price);
                        }
                      });
                    }
                  });
                  
                  // If we found slots, no need to check more dates for this subvenue
                  if (slots.length > 0) break;
                } catch (err) {
                  // If fetching slots fails for this date, try next date
                  // Only log if it's not a 404 (no slots for that date)
                }
              }
            }
            
            const venueData = {
              ...venue,
              minPrice: allPrices.length > 0 ? Math.min(...allPrices) : undefined,
              maxPrice: allPrices.length > 0 ? Math.max(...allPrices) : undefined,
              hasAvailableSlots: hasAnyAvailableSlots,
            };
            
            return venueData;
          } catch (err) {
            // If fetching subvenues fails, return venue without price info
            return { ...venue, minPrice: undefined, maxPrice: undefined, hasAvailableSlots: false };
          }
        })
      );
      
      setVenues(venuesWithPrices);
    } catch (err: any) {
      setError(err.message || "Failed to load venues");
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSelectedSport("");
    setSelectedCity("");
    setMaxPrice("");
    setSearchQuery("");
    fetchAllVenues();
  };

  // Client-side filtering
  const filteredVenues = venues.filter((v) => {
    const matchesSearch = !searchQuery || v.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSport = !selectedSport || v.sports?.includes(selectedSport.toLowerCase());
    const matchesCity = !selectedCity || v.city?.toLowerCase().includes(selectedCity.toLowerCase());
    
    // Price filtering: check if venue has available slots within the max price limit
    // Only show venues that have available slots with prices <= maxPrice
    const matchesPrice = !maxPrice || (
      v.hasAvailableSlots && 
      v.minPrice != null && 
      v.minPrice <= parseFloat(maxPrice)
    );
    
    return matchesSearch && matchesSport && matchesCity && matchesPrice;
  });

  const activeFiltersCount = [selectedSport, selectedCity, maxPrice].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-background border-b border-primary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Explore Venues</h1>
              <p className="text-muted-foreground">Find and book the perfect venue for your game</p>
            </div>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              className="button-style1 shadow-md active:scale-95 transition-all duration-300 ease-linear w-full sm:w-auto"
            >
              <Filter className="w-5 h-5 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="ml-2 bg-white/20 text-white px-2 py-0.5 rounded-full text-xs">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Search Bar */}
        <div className="mb-6 relative">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
            <input
              type="text"
              placeholder="Search venues by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-4 rounded-xl bg-card/80 backdrop-blur-sm border border-primary/20 hover:border-primary/40 text-foreground text-lg shadow-md focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={clearFilters}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-muted-foreground hover:text-primary transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="mb-6 p-6 bg-card/80 backdrop-blur-sm rounded-xl border border-primary/20 hover:border-primary/40 shadow-lg transition-all">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Sport Filter */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-foreground flex items-center gap-2">
                  <div className="w-1 h-4 bg-primary rounded-full"></div>
                  Sport
                </label>
                <select
                  value={selectedSport}
                  onChange={(e) => setSelectedSport(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-background/50 border border-primary/20 hover:border-primary/40 text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all"
                >
                  <option value="">All Sports</option>
                  {sports.map((sport) => (
                    <option key={sport} value={sport}>{sport}</option>
                  ))}
                </select>
              </div>

              {/* City Filter */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-foreground flex items-center gap-2">
                  <MapPin size={14} className="text-primary" /> City
                </label>
                <input
                  type="text"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  placeholder="e.g., Mumbai"
                  className="w-full px-3 py-2.5 rounded-lg bg-background/50 border border-primary/20 hover:border-primary/40 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all"
                />
              </div>

              {/* Max Price Filter */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-foreground flex items-center gap-2">
                  <DollarSign size={14} className="text-primary" /> Max Price (₹/hour)
                </label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="e.g., 1500"
                  className="w-full px-3 py-2.5 rounded-lg bg-background/50 border border-primary/20 hover:border-primary/40 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex gap-3">
              <button
                onClick={clearFilters}
                className="px-6 py-2 bg-primary/10 border border-primary/30 hover:border-primary/60 text-primary rounded-lg hover:bg-primary/20 transition-all font-semibold"
              >
                <X className="inline w-4 h-4 mr-1" />
                Clear All
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center text-muted-foreground text-xl py-10 flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            Loading venues...
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center text-red-400 text-xl py-10 bg-red-500/10 rounded-xl border border-red-500/30">
            {error}
          </div>
        )}

        {/* Results Count */}
        {!loading && !error && (
          <div className="mb-4 text-muted-foreground">
            Found <span className="font-bold text-foreground">{filteredVenues.length}</span> venues
          </div>
        )}

        {/* Venues Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVenues.map((venue) => (
              <VenueCard
                key={venue._id}
                id={venue._id}
                name={venue.name}
                address={venue.address}
                city={venue.city}
                rating={venue.averageRating}
                reviews={venue.totalRatings}
                sports={venue.sports}
                image={venue.images?.[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"}
              />
            ))}
          </div>
        )}

        {!loading && !error && filteredVenues.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-card/50 border border-primary/20 rounded-xl p-8 max-w-md mx-auto">
              <p className="text-muted-foreground text-xl mb-4">
                No venues found matching your criteria.
              </p>
              <button
                onClick={clearFilters}
                className="button-style1 px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <X className="inline w-4 h-4 mr-2" />
                Clear Filters & Show All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Venues;

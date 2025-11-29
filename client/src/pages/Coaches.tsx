import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiGetAllCoaches } from "../services/api";
import CoachCard from "../components/cards/CoachCard";
import { ChevronDown, X, SlidersHorizontal, ChevronUp } from "lucide-react";

interface Coach {
  id: string;
  username: string;
  email: string;
  profilePhoto: string;
  age: number;
  gender: string;
  sports: string[];
  location: {
    city: string;
    state: string;
    country: string;
  };
  pricing: number;
  experience: number;
}

const sports = [
  "cricket",
  "football",
  "badminton",
  "tennis",
  "volleyball",
  "basketball",
  "tabletennis",
  "swimming",
  "hockey",
  "kabaddi",
];

function Coaches() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const [selectedSport, setSelectedSport] = useState<string>("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [minExperience, setMinExperience] = useState<number>(0);
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  // Featch Coaches
  useEffect(() => {
    const loadCoaches = async () => {
      try {
        setLoading(true);
        const response = await apiGetAllCoaches();
        setCoaches(response.coaches);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadCoaches();
  }, []);

  // Locations for filters
  const uniqueLocations = useMemo(() => {
    const cities = new Set<string>();
    const states = new Set<string>();
    const countries = new Set<string>();

    coaches.forEach((coach) => {
      if (coach.location.city) cities.add(coach.location.city);
      if (coach.location.state) states.add(coach.location.state);
      if (coach.location.country) countries.add(coach.location.country);
    });

    return {
      cities: Array.from(cities).sort(),
      states: Array.from(states).sort(),
      countries: Array.from(countries).sort(),
    };
  }, [coaches]);

  // Get max price 
  const maxPrice = useMemo(() => {
    if (coaches.length === 0) return 10000;
    return Math.max(...coaches.map((c) => c.pricing || 0), 10000);
  }, [coaches]);

  // Filter coaches based on selected filters
  const filteredCoaches = useMemo(() => {
    return coaches.filter((coach) => {
      // Sport filter 
      if (selectedSport && !coach.sports.includes(selectedSport)) {
        return false;
      }

      // Price filter
      if (coach.pricing < priceRange[0] || coach.pricing > priceRange[1]) {
        return false;
      }

      // Experience filter
      if (coach.experience < minExperience) {
        return false;
      }

      // Location filters
      if (selectedCity && coach.location.city !== selectedCity) {
        return false;
      }
      if (selectedState && coach.location.state !== selectedState) {
        return false;
      }
      if (selectedCountry && coach.location.country !== selectedCountry) {
        return false;
      }

      return true;
    });
  }, [
    coaches,
    selectedSport,
    priceRange,
    minExperience,
    selectedCity,
    selectedState,
    selectedCountry,
  ]);

  // Clear filters
  const clearFilters = () => {
    setSelectedSport("");
    setPriceRange([0, maxPrice]);
    setMinExperience(0);
    setSelectedCity("");
    setSelectedState("");
    setSelectedCountry("");
  };

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedSport) count++;
    if (priceRange[0] > 0 || priceRange[1] < maxPrice) count++;
    if (minExperience > 0) count++;
    if (selectedCity) count++;
    if (selectedState) count++;
    if (selectedCountry) count++;
    return count;
  }, [selectedSport, priceRange, minExperience, selectedCity, selectedState, selectedCountry, maxPrice]);

  // Redirect to coach details
  const handleCoachClick = (coachId: string) => {
    navigate(`/coach/${coachId}`);
  };

  return (
    <div className="min-h-screen bg-white/10 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <h1 className="text-4xl font-bold  mb-10 justify-center flex">
          Find&nbsp;Your&nbsp;<span className="text-primary">Coach</span>
        </h1>

        {/* Filter Toggle */}
        <div className="mb-6 rounded-xl">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between px-4 py-3 bg-card/40 backdrop-blur border border-primary/20 rounded-xl  hover:bg-card/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5" />
              <span className="font-medium">Filters</span>
              {activeFiltersCount > 0 && (
                <span className="bg-primary text-xs px-2 py-0.5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </div>
            {
              showFilters ? (<ChevronUp className="w-5 h-5 transition-transform text-primary" />) : (
                <ChevronDown className="w-5 h-5 transition-transform text-primary" />
              )
            }
            
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {/* Filters Sidebar */}
          <div
            className={`${
              showFilters ? "block" : "hidden"
            } flex-shrink-0`}
          >
            <div className="bg-card/40 backdrop-blur border border-primary/20 rounded-xl p-6 space-y-4 sticky top-6">
              {/* Header */}
              <div className="flex items-center justify-end">
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm  bg-primary/90 text-primary-foreground px-2 py-1 rounded-xl border-2 border-transparent hover:border-white transition-colors flex items-center gap-1"
                  >
                    <X className="w-4 h-4 font-bold" />
                    Clear All
                  </button>
                )}
              </div>

              {/* Sport Filter */}
              <div className="space-y-2">
                <label className="text-sm font-semibold uppercase tracking-wide">
                  Sport 
                </label>
                <select
                  value={selectedSport}
                  onChange={(e) => setSelectedSport(e.target.value)}
                  className="md:w-full mx-2 md:mx-0 px-4 py-2.5 bg-background/60 border border-primary/20 rounded-xl  focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all capitalize"
                >
                  <option value="">All Sports</option>
                  {sports.map((sport) => (
                    <option key={sport} value={sport}>
                      {sport}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range Filter */}
              <div className="space-y-3">
                <label className="text-sm font-semibold  uppercase tracking-wide">
                  Price Range
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Min Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      max={maxPrice}
                      value={priceRange[0] || ''}
                      onChange={(e) =>
                        setPriceRange([Number(e.target.value) || 0, priceRange[1]])
                      }
                      className="w-full px-3 py-2 bg-background/60 border border-primary/20 rounded-xl  focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Max Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      max={maxPrice}
                      value={priceRange[1] === maxPrice ? '' : priceRange[1]}
                      onChange={(e) =>
                        setPriceRange([priceRange[0], Number(e.target.value) || maxPrice])
                      }
                      className="w-full px-3 py-2 bg-background/60 border border-primary/20 rounded-xl  focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder={maxPrice.toString()}
                    />
                  </div>
                </div>
              </div>

              {/* Experience Filter */}
              <div className="space-y-3">
                <label className="text-sm font-semibold  uppercase tracking-wide">
                  Minimum Experience
                </label>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Years</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={minExperience || ''}
                    onChange={(e) => setMinExperience(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-background/60 border border-primary/20 rounded-xl  focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Location Filters */}
              <div className="space-y-4 pt-4 border-t border-primary/20">
                <h3 className="text-sm font-semibold  uppercase tracking-wide">
                  Location
                </h3>

                {/* Country Filter */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Country</label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => {
                      setSelectedCountry(e.target.value);
                      setSelectedState("");
                      setSelectedCity("");
                    }}
                    className="w-full px-3 py-2 bg-background/60 border border-primary/20 rounded-xl  text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  >
                    <option value="">All Countries</option>
                    {uniqueLocations.countries.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </div>

                {/* State Filter */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">State</label>
                  <select
                    value={selectedState}
                    onChange={(e) => {
                      setSelectedState(e.target.value);
                      setSelectedCity("");
                    }}
                    className="w-full px-3 py-2 bg-background/60 border border-primary/20 rounded-xl  text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  >
                    <option value="">All States</option>
                    {uniqueLocations.states
                      .filter((state) =>
                        selectedCountry
                          ? coaches.some(
                              (c) =>
                                c.location.state === state &&
                                c.location.country === selectedCountry
                            )
                          : true
                      )
                      .map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                  </select>
                </div>

                {/* City Filter */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">City</label>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full px-3 py-2 bg-background/60 border border-primary/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  >
                    <option value="">All Cities</option>
                    {uniqueLocations.cities
                      .filter((city) => {
                        if (selectedState) {
                          return coaches.some(
                            (c) =>
                              c.location.city === city &&
                              c.location.state === selectedState
                          );
                        }
                        if (selectedCountry) {
                          return coaches.some(
                            (c) =>
                              c.location.city === city &&
                              c.location.country === selectedCountry
                          );
                        }
                        return true;
                      })
                      .map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

            </div>
          </div>

          {/* All coaches */}

          <div className="flex-1 min-w-0">

            {/* Count */}
            {!loading && !error && (
              <div className="mb-6 flex items-center justify-between">
                <p className="text-muted-foreground">
                  {filteredCoaches.length} coach{filteredCoaches.length !== 1 ? "es" : ""} found
                </p>
              </div>
            )}

            {/* Loading*/}
            {loading && (
              <div className="flex flex-col items-center justify-center py-28 space-y-4">
                <div className="h-14 w-14 animate-spin rounded-full border-4 border-primary/20 border-t-primary"></div>
                <p className="text-muted-foreground">Loading amazing coaches...</p>
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="text-center py-20">
                <p className="text-red-500 text-lg font-medium">{error}</p>
                <p className="text-muted-foreground text-sm">
                  Please try again later.
                </p>
              </div>
            )}

            {/* No Coaches */}
            {!loading && !error && filteredCoaches.length === 0 && (
              <div className="flex flex-col items-center py-24 space-y-4 bg-card/40 backdrop-blur border border-primary/20 rounded-xl">
                <svg
                  className="h-14 w-14 text-primary/60"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 10h16M4 14h10M4 18h6"
                  />
                </svg>
                <p className="text-lg font-semibold">No coaches found</p>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="mt-2 px-4 py-2 bg-primary hover:bg-primary/90 border-2 border-transparent hover:border-white text-secondary font-semibold rounded-xl transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}

            {/* Coaches Grid */}
            {!loading && !error && filteredCoaches.length > 0 && (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {filteredCoaches.map((coach) => (
                  <div
                    key={coach.id}
                    className="transition-all duration-300 group hover:scale-[1.02] hover:-translate-y-1"
                    onClick={() => handleCoachClick(coach.id)}
                  >
                    <CoachCard coach={coach} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Coaches;

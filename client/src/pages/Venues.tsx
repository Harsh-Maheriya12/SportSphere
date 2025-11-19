import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiGetAllVenues } from "../services/api";
import { Venue } from "../types";
import VenueCard from "../components/cards/VenueCard";

function Venues() {
  const [search, setSearch] = useState("");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        setLoading(true);
        const response = await apiGetAllVenues();
        setVenues(response.venues);
      } catch (err: any) {
        setError(err.message || "Failed to load venues");
        console.error("Error fetching venues:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, []);

  const filteredVenues = venues.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container bg-white/10 min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-4 text-primary">Venues</h1>

      {/* Search Bar */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="Search venue..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 rounded-xl bg-white/20 backdrop-blur border border-white/30 text-lg shadow-md"
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center text-white/70 text-xl py-10">
          Loading venues...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center text-red-400 text-xl py-10">
          {error}
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
        <p className="text-white/70 mt-10 text-center text-xl">
          No venues found. Try another search.
        </p>
      )}
    </div>
  );
}

export default Venues;

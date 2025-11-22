import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiGetVenueById, apiGetSubVenuesByVenue } from "../services/api";
import { Venue, SubVenue } from "../types";

const formatSportName = (sport: string) => {
  if (sport.toLowerCase() === "tabletennis") return "Table Tennis";
  return sport
    .split(/(?=[A-Z])|\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export default function VenueDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [venue, setVenue] = useState<Venue | null>(null);
  const [subVenues, setSubVenues] = useState<SubVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchVenueData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const [venueResponse, subVenuesResponse] = await Promise.all([
          apiGetVenueById(id),
          apiGetSubVenuesByVenue(id),
        ]);
        
        setVenue(venueResponse.venue);
        setSubVenues(subVenuesResponse.subVenues);
      } catch (err: any) {
        setError(err.message || "Failed to load venue details");
        console.error("Error fetching venue:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVenueData();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-4 text-center py-20">
        <div className="text-xl">Loading venue details...</div>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="max-w-5xl mx-auto p-4 text-center py-20">
        <div className="text-xl text-red-500">{error || "Venue not found"}</div>
        <button
          onClick={() => navigate("/venues")}
          className="mt-4 bg-primary text-white px-6 py-2 rounded-xl"
        >
          Back to Venues
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4">

      {/* ---------- Image ---------- */}
      <img
        src={venue.images?.[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1100&q=80"}
        alt={venue.name}
        className="w-full h-72 object-cover rounded-xl shadow-md mb-6"
      />

      {/* ---------- Row: Name on Left, Buttons on Right ---------- */}
      <div className="flex items-center justify-between mb-4">

        {/* Venue Name + Location */}
        <div>
          <h1 className="text-3xl font-bold">{venue.name}</h1>
          <p className="text-gray-600">{venue.city}, {venue.address}</p>
          {venue.phone && <p className="text-gray-600">Phone: {venue.phone}</p>}
        </div>

        {/* Buttons on Right */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/host-game`)}
            className="bg-white border border-gray-300 text-black px-4 py-2 rounded-xl font-semibold shadow-md hover:bg-gray-100"
          >
            Host Game
          </button>

          <button
            onClick={() => navigate(`/venue/${id}/book`)}
            className="bg-green-600 text-white px-4 py-2 rounded-xl font-semibold shadow-md hover:bg-green-700"
          >
            Book Now
          </button>
        </div>

      </div>

      {/* ---------- Description ---------- */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Description</h2>
          <p className="text-gray-700">
            {venue.description || "No description available."}
          </p>
        </div>

        {/* ---------- Sports Available ---------- */}
        {venue.sports && venue.sports.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-2">Sports Available</h2>
            <div className="flex flex-wrap gap-2">
              {venue.sports.map((sport, idx) => (
                <span
                  key={idx}
                  className="bg-primary/20 text-primary px-4 py-2 rounded-lg font-medium"
                >
                  {formatSportName(sport)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ---------- Amenities ---------- */}
        {venue.amenities && venue.amenities.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-2">Amenities</h2>
            <div className="flex flex-wrap gap-2">
              {venue.amenities.map((amenity, idx) => (
                <span
                  key={idx}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg"
                >
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ---------- Sub-Venues / Courts ---------- */}
        {subVenues.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-3">Available Courts/Fields</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subVenues.map((subVenue) => (
                <div
                  key={subVenue._id}
                  className="border border-gray-300 rounded-xl p-4 bg-white/50 hover:shadow-lg transition"
                >
                  <h3 className="text-lg font-semibold mb-2">{subVenue.name}</h3>
                  {subVenue.description && (
                    <p className="text-sm text-gray-600 mb-2">{subVenue.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {subVenue.sports.map((sport, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                      >
                        {formatSportName(sport.name)} ({sport.minPlayers}-{sport.maxPlayers} players)
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------- Ratings ---------- */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Rating</h2>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-orange-500">
              {venue.averageRating > 0 ? venue.averageRating.toFixed(1) : "N/A"}
            </span>
            <span className="text-gray-600">
              ({venue.totalRatings} {venue.totalRatings === 1 ? "rating" : "ratings"})
            </span>
          </div>
        </div>

        {/* ---------- Photos Gallery ---------- */}
        {venue.images && venue.images.length > 1 && (
          <div>
            <h2 className="text-xl font-semibold mb-3">Photos</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {venue.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`${venue.name} ${idx + 1}`}
                  className="w-full h-32 object-cover rounded-lg shadow"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

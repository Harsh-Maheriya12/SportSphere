import React from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function VenueDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Hardcoded venue
  const venue = {
    id: id,
    name: "Elite Sports Arena",
    location: "Bandra, Mumbai",
    description:
      "Elite Sports Arena offers state-of-the-art facilities, premium turf, lighting, and professional-grade courts for multiple sports.",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1100&q=80",
  };

  return (
    <div className="max-w-5xl mx-auto p-4">

      {/* ---------- Image ---------- */}
      <img
        src={venue.image}
        alt={venue.name}
        className="w-full h-72 object-cover rounded-xl shadow-md mb-6"
      />

      {/* ---------- Row: Name on Left, Buttons on Right ---------- */}
      <div className="flex items-center justify-between mb-4">

        {/* Venue Name + Location */}
        <div>
          <h1 className="text-3xl font-bold">{venue.name}</h1>
          <p className="text-gray-600">{venue.location}</p>
        </div>

        {/* Buttons on Right */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/venues/${id}/host-game`)}
            className="bg-white border border-gray-300 text-black px-4 py-2 rounded-xl font-semibold shadow-md hover:bg-gray-100"
          >
            Host Game
          </button>

          <button
            onClick={() => navigate(`/venues/${id}/book`)}
            className="bg-green-600 text-white px-4 py-2 rounded-xl font-semibold shadow-md hover:bg-green-700"
          >
            Book Now
          </button>
        </div>

      </div>

      {/* ---------- Description ---------- */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Description</h2>
          <p className="text-gray-700 mt-1">{venue.description}</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Reviews</h2>
          <p className="text-gray-700 mt-1">Coming soon...</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Photos</h2>
          <p className="text-gray-700 mt-1">Coming soon...</p>
        </div>
      </div>
    </div>
  );
}

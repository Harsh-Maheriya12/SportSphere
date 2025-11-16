import React, { useState } from "react";
import { Link } from "react-router-dom";

function Venues() {
  const [search, setSearch] = useState("");

  // Hardcoded sample data until backend is ready
  const venues = [
    {
      id: 1,
      name: "Elite Sports Arena",
      location: "Bandra, Mumbai",
      image:
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: 2,
      name: "Green Turf Grounds",
      location: "Andheri West",
      image:
        "https://images.unsplash.com/photo-1599058917212-d750089bc07d?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: 3,
      name: "Prime Court Stadium",
      location: "Lower Parel",
      image:
        "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=800&q=80",
    },
  ];

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

      {/* Venues Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVenues.map((venue) => (
          <Link
            to={`/venues/${venue.id}`}
            key={venue.id}
            className="bg-white/20 backdrop-blur rounded-2xl overflow-hidden shadow-md hover:scale-[1.02] transition cursor-pointer"
          >
            <img
              src={venue.image}
              alt={venue.name}
              className="w-full h-48 object-cover"
            />

            <div className="p-4">
              <h2 className="text-2xl font-semibold text-white">
                {venue.name}
              </h2>
              <p className="text-white/80">{venue.location}</p>
            </div>
          </Link>
        ))}
      </div>

      {filteredVenues.length === 0 && (
        <p className="text-white/70 mt-10 text-center text-xl">
          No venues found. Try another search.
        </p>
      )}
    </div>
  );
}

export default Venues;

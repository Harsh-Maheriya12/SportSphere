import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiGetVenueById, apiGetSubVenuesByVenue } from "../services/api";
import { Venue, SubVenue } from "../types";
import Plasma from "../components/background/Plasma";
import { MapPin, Phone, Star, Calendar, Users, ChevronLeft, Sparkles } from "lucide-react";

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
      } finally {
        setLoading(false);
      }
    };

    fetchVenueData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen relative">
        <div className="absolute inset-0 z-0">
          <Plasma color="#ff6b35" speed={0.6} direction="forward" scale={2.2} opacity={0.8} />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="text-2xl font-semibold text-white">Loading venue details...</div>
        </div>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="min-h-screen relative">
        <div className="absolute inset-0 z-0">
          <Plasma color="#ff6b35" speed={0.6} direction="forward" scale={2.2} opacity={0.8} />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="text-2xl font-semibold text-red-400 mb-6">{error || "Venue not found"}</div>
          <button
            onClick={() => navigate("/venues")}
            className="bg-white/20 backdrop-blur-md border border-primary/20 hover:border-primary/60 text-white px-8 py-3 rounded-xl font-semibold hover:bg-white/30 transition-all"
          >
            Back to Venues
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6">
        
        {/* Back Button */}
        <button
          onClick={() => navigate("/venues")}
          className="mb-4 flex items-center gap-2 bg-card/80 backdrop-blur-sm border border-primary/20 hover:border-primary/60 text-foreground px-3 py-2 rounded-lg text-sm hover:bg-card transition-all"
        >
          <ChevronLeft size={18} />
          Back to Venues
        </button>

        {/* Hero Section with Image */}
        <div className="mb-6 rounded-xl overflow-hidden shadow-xl">
          <img
            src={venue.images?.[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1100&q=80"}
            alt={venue.name}
            className="w-full h-64 object-cover"
          />
        </div>

        {/* Main Content Card */}
        <div className="bg-card/80 backdrop-blur-sm border border-primary/20 rounded-xl p-6 shadow-xl">
          
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6 gap-4">
            
            {/* Left: Name & Details */}
            <div className="flex-1">
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-3">{venue.name}</h1>
              
              <div className="space-y-1.5 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-primary" />
                  <span className="text-base">{venue.address}, {venue.city}</span>
                </div>
                {venue.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-primary" />
                    <span className="text-base">{venue.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <Star size={18} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-xl font-bold text-foreground">
                    {venue.averageRating > 0 ? venue.averageRating.toFixed(1) : "N/A"}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    ({venue.totalRatings} {venue.totalRatings === 1 ? "review" : "reviews"})
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
              <button
                onClick={() => navigate(`/venue/${id}/book`)}
                className="button-style1 px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                <Calendar size={18} />
                Book Now
              </button>

              <button
                onClick={() => navigate(`/host-game`)}
                className="bg-card/80 backdrop-blur-sm border-2 border-primary/20 hover:border-primary/60 text-foreground px-6 py-3 rounded-xl font-semibold hover:bg-card transition-all flex items-center justify-center gap-2"
              >
                <Users size={18} />
                Host Game
              </button>
            </div>

          </div>

          {/* Description */}
          {venue.description && (
            <div className="mb-6 p-4 bg-card/50 backdrop-blur-sm rounded-lg border border-primary/20">
              <h2 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                <Sparkles size={18} className="text-primary" />
                About This Venue
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {venue.description}
              </p>
            </div>
          )}

          {/* Sports Available */}
          {venue.sports && venue.sports.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-foreground mb-3">Sports Available</h2>
              <div className="flex flex-wrap gap-2">
                {venue.sports.map((sport, idx) => (
                  <span
                    key={idx}
                    className="bg-gradient-to-r from-primary/20 to-orange-500/20 backdrop-blur-sm border border-primary/20 hover:border-primary/60 text-foreground px-4 py-2 rounded-lg font-semibold text-sm shadow-md hover:scale-105 transition-transform cursor-pointer"
                  >
                    {formatSportName(sport)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Amenities */}
          {venue.amenities && venue.amenities.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-foreground mb-3">Amenities</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {venue.amenities.map((amenity, idx) => (
                  <div
                    key={idx}
                    className="bg-card/50 backdrop-blur-sm border border-primary/20 hover:border-primary/60 text-foreground px-3 py-2 rounded-lg text-center text-sm font-medium hover:bg-card/70 transition-all cursor-pointer"
                  >
                    {amenity}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-Venues / Courts */}
          {subVenues.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-foreground mb-3">Available Courts & Fields</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {subVenues.map((subVenue) => (
                  <div
                    key={subVenue._id}
                    className="bg-card/50 backdrop-blur-sm border border-primary/20 hover:border-primary/60 rounded-lg p-4 hover:bg-card/70 hover:shadow-lg transition-all cursor-pointer"
                  >
                    <h3 className="text-base font-bold text-foreground mb-1.5">{subVenue.name}</h3>
                    {subVenue.description && (
                      <p className="text-muted-foreground text-sm mb-2">{subVenue.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {subVenue.sports.map((sport, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 text-foreground px-2 py-1 rounded font-medium"
                        >
                          {formatSportName(sport.name)} ({sport.minPlayers}-{sport.maxPlayers} players)
                        </span>
                      ))}
                    </div>
                    <div className="mt-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        subVenue.status === 'active' 
                          ? 'bg-green-500/20 border border-green-400/30 text-green-400' 
                          : 'bg-gray-500/20 border border-gray-400/30 text-gray-400'
                      }`}>
                        {subVenue.status === 'active' ? '✓ Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Photos Gallery */}
          {venue.images && venue.images.length > 1 && (
            <div>
              <h2 className="text-lg font-bold text-foreground mb-3">Photo Gallery</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {venue.images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative group overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all"
                  >
                    <img
                      src={img}
                      alt={`${venue.name} ${idx + 1}`}
                      className="w-full h-32 object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

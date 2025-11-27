import React, { useState, useEffect } from "react";
import { Building2, Plus, Edit2, Trash2, MapPin, Phone } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  apiGetMyVenues,
  apiCreateVenue,
  apiUpdateVenue,
  apiDeleteVenue,
} from "../../services/api";
import { Venue } from "../../types";
import VenueDashboardNav from "../../components/VenueDashboardNav";
import { Button } from "../../components/ui/button";

function ManageVenues() {
  const { user } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  // Latitude/Longitude removed from creation per request
  const [amenitiesInput, setAmenitiesInput] = useState("");

  useEffect(() => {
    loadVenues();
  }, []);

  useEffect(() => {
    if (error) setTimeout(() => setError(""), 3000);
  }, [error]);

  useEffect(() => {
    if (success) setTimeout(() => setSuccess(""), 3000);
  }, [success]);

  const loadVenues = async () => {
    try {
      setLoading(true);
      const response = await apiGetMyVenues();
      setVenues(response.venues);
    } catch (err: any) {
      setError(err.message || "Failed to load venues");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const amenities = amenitiesInput
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);

      if (editingVenue) {
        // Update existing venue
        await apiUpdateVenue(editingVenue._id, {
          name,
          description,
          phone,
          address,
          city,
          state,
          amenities,
        });
        setSuccess("Venue updated successfully!");
      } else {
        // Create new venue
        await apiCreateVenue(
          name,
          description,
          phone,
          address,
          city,
          state,
          amenities
        );
        setSuccess("Venue created successfully!");
      }

      resetForm();
      loadVenues();
    } catch (err: any) {
      setError(err.message || "Operation failed");
    }
  };

  const handleEdit = (venue: Venue) => {
    setEditingVenue(venue);
    setName(venue.name);
    setDescription(venue.description || "");
    setPhone(venue.phone || "");
    setAddress(venue.address);
    setCity(venue.city);
    setState(venue.state || "");
    // Coordinates are no longer edited in this form
    // Normalize amenities for input in case stored as JSON string
    let amenitiesForInput = "";
    if (Array.isArray(venue.amenities)) {
      if (
        venue.amenities.length === 1 &&
        typeof venue.amenities[0] === "string" &&
        venue.amenities[0].trim().startsWith("[")
      ) {
        try {
          const parsed = JSON.parse(venue.amenities[0]);
          if (Array.isArray(parsed)) {
            amenitiesForInput = parsed.map((s: string) => s.trim()).join(", ");
          }
        } catch (_) {
          amenitiesForInput = venue.amenities.join(", ");
        }
      } else {
        amenitiesForInput = venue.amenities
          .map((a) => a.replace(/^[\[\]"']+|[\[\]"']+$/g, "").trim())
          .filter(Boolean)
          .join(", ");
      }
    }
    setAmenitiesInput(amenitiesForInput);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this venue?")) return;

    try {
      await apiDeleteVenue(id);
      setSuccess("Venue deleted successfully!");
      loadVenues();
    } catch (err: any) {
      setError(err.message || "Failed to delete venue");
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setPhone("");
    setAddress("");
    setCity("");
    setState("");
    // Coordinates cleared are not needed anymore
    setAmenitiesInput("");
    setEditingVenue(null);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-6xl mx-auto">
        {/* Header with gradient */}
        <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-xl backdrop-blur">
              <Building2 size={40} className="text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-foreground">
                My Venues
              </h1>
              <p className="text-muted-foreground mt-1">Manage your sports facilities</p>
            </div>
          </div>
        </div>

        <VenueDashboardNav />

        {/* Messages */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/20 border border-green-500 text-green-100 px-4 py-3 rounded-xl mb-4">
            {success}
          </div>
        )}

        {/* Add Venue Button */}
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="mb-6 flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 transition-all bg-gradient-to-r from-primary to-primary/80"
            size="lg"
          >
            <Plus size={20} className="animate-pulse" />
            Add New Venue
          </Button>
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-gradient-to-br from-card/80 to-primary/5 backdrop-blur-md rounded-2xl border-2 border-primary/20 p-6 mb-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                {editingVenue ? "Edit Venue" : "Create New Venue"}
              </h2>
            </div>

            <form onSubmit={handleCreateOrUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="group">
                  <label className="block text-foreground mb-2 font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full group-hover:animate-pulse"></span>
                    Venue Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full p-3 rounded-xl bg-card/80 backdrop-blur border-2 border-primary/20 hover:border-primary/40 text-foreground transition-all shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                    placeholder="e.g., Elite Sports Arena"
                  />
                </div>

                <div className="group">
                  <label className="block text-foreground mb-2 font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full group-hover:animate-pulse"></span>
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-3 rounded-xl bg-card/80 backdrop-blur border-2 border-primary/20 hover:border-primary/40 text-foreground transition-all shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                    placeholder="e.g., +1234567890"
                  />
                </div>

                <div className="md:col-span-2 group">
                  <label className="block text-foreground mb-2 font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full group-hover:animate-pulse"></span>
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full p-3 rounded-xl bg-card/80 backdrop-blur border-2 border-primary/20 hover:border-primary/40 text-foreground transition-all shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                    placeholder="Describe your venue..."
                  />
                </div>

                <div className="md:col-span-2 group">
                  <label className="block text-foreground mb-2 font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full group-hover:animate-pulse"></span>
                    Address *
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    className="w-full p-3 rounded-xl bg-card/80 backdrop-blur border-2 border-primary/20 hover:border-primary/40 text-foreground transition-all shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                    placeholder="Street address"
                  />
                </div>

                <div className="group">
                  <label className="block text-foreground mb-2 font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full group-hover:animate-pulse"></span>
                    City *
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    className="w-full p-3 rounded-xl bg-card/80 backdrop-blur border-2 border-primary/20 hover:border-primary/40 text-foreground transition-all shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                    placeholder="e.g., Mumbai"
                  />
                </div>

                <div className="group">
                  <label className="block text-foreground mb-2 font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full group-hover:animate-pulse"></span>
                    State
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full p-3 rounded-xl bg-card/80 backdrop-blur border-2 border-primary/20 hover:border-primary/40 text-foreground transition-all shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                    placeholder="e.g., Maharashtra"
                  />
                </div>

                {/* Latitude/Longitude inputs removed by request */}

                <div className="md:col-span-2 group">
                  <label className="block text-foreground mb-2 font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full group-hover:animate-pulse"></span>
                    Amenities (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={amenitiesInput}
                    onChange={(e) => setAmenitiesInput(e.target.value)}
                    className="w-full p-3 rounded-xl bg-card/80 backdrop-blur border-2 border-primary/20 hover:border-primary/40 text-foreground transition-all shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                    placeholder="e.g., Parking, Changing Rooms, Cafeteria"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  type="submit" 
                  className="flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                  size="lg"
                >
                  {editingVenue ? "Update Venue" : "Create Venue"}
                </Button>
                <Button
                  type="button"
                  onClick={resetForm}
                  variant="secondary"
                  className="shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                  size="lg"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Venues List */}
        {loading ? (
          <div className="text-center text-white text-xl py-10">
            Loading venues...
          </div>
        ) : venues.length === 0 ? (
          <div className="relative overflow-hidden bg-gradient-to-br from-card/80 to-primary/5 backdrop-blur-md rounded-2xl border-2 border-dashed border-primary/30 p-12 text-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/10 rounded-full -ml-12 -mb-12"></div>
            <div className="relative">
              <div className="inline-block p-4 bg-primary/20 rounded-full mb-4 animate-bounce">
                <Building2 size={48} className="text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                No Venues Yet
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Start by creating your first venue to begin managing your sports facilities.
              </p>
              <Button
                onClick={() => setShowForm(true)}
                className="shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                size="lg"
              >
                <Plus size={20} className="mr-2" />
                Create Your First Venue
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {venues.map((venue) => (
              <div
                key={venue._id}
                className="group relative overflow-hidden rounded-2xl border-2 border-primary/20 hover:border-primary/60 transition-all shadow-lg hover:shadow-xl bg-gradient-to-br from-card/80 to-primary/5 backdrop-blur"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground">
                          {venue.name}
                        </h3>
                      </div>
                      <div className="space-y-2">
                        <p className="text-muted-foreground flex items-center gap-2">
                          <MapPin size={16} className="text-primary" />
                          {venue.city}, {venue.address}
                        </p>
                        {venue.phone && (
                          <p className="text-muted-foreground flex items-center gap-2">
                            <Phone size={16} className="text-primary" />
                            {venue.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleEdit(venue)}
                        variant="outline"
                        size="icon"
                        className="hover:scale-110 transition-all shadow-sm"
                      >
                        <Edit2 size={18} />
                      </Button>
                      <Button
                        onClick={() => handleDelete(venue._id)}
                        variant="destructive"
                        size="icon"
                        className="hover:scale-110 transition-all shadow-sm"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>

                  {venue.description && (
                    <p className="text-muted-foreground mb-4 p-3 bg-background/50 rounded-lg">
                      {venue.description}
                    </p>
                  )}

                  {venue.amenities && venue.amenities.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">AMENITIES</p>
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          let list: string[] = [];
                          if (
                            venue.amenities.length === 1 &&
                            typeof venue.amenities[0] === "string" &&
                            venue.amenities[0].trim().startsWith("[")
                          ) {
                            try {
                              const parsed = JSON.parse(venue.amenities[0]);
                              if (Array.isArray(parsed)) list = parsed;
                            } catch (_) {
                              list = venue.amenities as unknown as string[];
                            }
                          } else {
                            list = (venue.amenities as unknown as string[]);
                          }

                          return list
                            .map((a) =>
                              String(a)
                                .replace(/^[\[\]"']+|[\[\]"']+$/g, "")
                                .trim()
                            )
                            .filter(Boolean)
                            .map((amenity, idx) => (
                          <span
                            key={idx}
                            className="bg-primary/10 border border-primary/30 px-3 py-1 rounded-lg text-sm text-foreground font-medium"
                          >
                            {amenity}
                          </span>
                            ));
                        })()}
                      </div>
                    </div>
                  )}

                  {venue.sports && venue.sports.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">SPORTS AVAILABLE</p>
                      <div className="flex flex-wrap gap-2">
                        {venue.sports.map((sport, idx) => (
                          <span
                            key={idx}
                            className="bg-gradient-to-r from-primary/30 to-primary/20 border border-primary/40 px-3 py-1 rounded-full text-sm font-semibold text-foreground"
                          >
                            {sport}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-primary/20">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{venue.averageRating.toFixed(1)}</span> ★ ({venue.totalRatings} reviews)
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ManageVenues;

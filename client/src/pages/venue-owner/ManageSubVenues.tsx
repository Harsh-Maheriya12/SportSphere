import React, { useState, useEffect } from "react";
import { MapPin, Plus, Edit2, Trash2, Users } from "lucide-react";
import {
  apiGetMyVenues,
  apiGetSubVenuesByVenue,
  apiCreateSubVenue,
  apiUpdateSubVenue,
  apiDeleteSubVenue,
} from "../../services/api";
import { Venue, SubVenue } from "../../types";
import VenueDashboardNav from "../../components/VenueDashboardNav";
import { Button } from "../../components/ui/button";

// Display labels aligned to backend enum (lowercase, no spaces)
const SPORTS_DISPLAY = [
  "Cricket",
  "Football",
  "Badminton",
  "Tennis",
  "Volleyball",
  "Basketball",
  "Table Tennis",
  "Swimming",
  "Hockey",
  "Kabaddi",
];

const toEnumValue = (label: string) =>
  label.toLowerCase().replace(/\s+/g, ""); // e.g., "Table Tennis" -> "tabletennis"

const formatSportName = (enumName: string) => {
  if (enumName.toLowerCase() === "tabletennis") return "Table Tennis";
  // Title case the rest
  return enumName
    .split(/\s+/)
    .join(" ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

function ManageSubVenues() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [subVenues, setSubVenues] = useState<SubVenue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingSubVenue, setEditingSubVenue] = useState<SubVenue | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sports, setSports] = useState<
    { name: string; minPlayers: number; maxPlayers: number }[]
  >([]);
  const [selectedSport, setSelectedSport] = useState("");
  const [minPlayers, setMinPlayers] = useState(2);
  const [maxPlayers, setMaxPlayers] = useState(10);

  useEffect(() => {
    loadVenues();
  }, []);

  useEffect(() => {
    if (selectedVenue) {
      loadSubVenues(selectedVenue._id);
    }
  }, [selectedVenue]);

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
      if (response.venues.length > 0) {
        setSelectedVenue(response.venues[0]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load venues");
    } finally {
      setLoading(false);
    }
  };

  const loadSubVenues = async (venueId: string) => {
    try {
      const response = await apiGetSubVenuesByVenue(venueId);
      setSubVenues(response.subVenues);
    } catch (err: any) {
      setError(err.message || "Failed to load sub-venues");
    }
  };

  const addSport = () => {
    if (!selectedSport) {
      setError("Please select a sport");
      return;
    }
    const enumName = toEnumValue(selectedSport);
    if (sports.find((s) => s.name === enumName)) {
      setError("Sport already added");
      return;
    }
    setSports([...sports, { name: enumName, minPlayers, maxPlayers }]);
    setSelectedSport("");
    setMinPlayers(2);
    setMaxPlayers(10);
  };

  const removeSport = (sportName: string) => {
    setSports(sports.filter((s) => s.name !== sportName));
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVenue) {
      setError("Please select a venue first");
      return;
    }
    if (sports.length === 0) {
      setError("Please add at least one sport");
      return;
    }

    try {
      if (editingSubVenue) {
        await apiUpdateSubVenue(editingSubVenue._id, {
          name,
          description,
          sports,
        });
        setSuccess("Court/Field updated successfully!");
      } else {
        await apiCreateSubVenue(selectedVenue._id, name, description, sports);
        setSuccess("Court/Field created successfully!");
      }

      resetForm();
      loadSubVenues(selectedVenue._id);
    } catch (err: any) {
      setError(err.message || "Operation failed");
    }
  };

  const handleEdit = (subVenue: SubVenue) => {
    setEditingSubVenue(subVenue);
    setName(subVenue.name);
    setDescription(subVenue.description || "");
    setSports(subVenue.sports);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this court/field?"))
      return;

    try {
      await apiDeleteSubVenue(id);
      setSuccess("Court/Field deleted successfully!");
      if (selectedVenue) loadSubVenues(selectedVenue._id);
    } catch (err: any) {
      setError(err.message || "Failed to delete");
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setSports([]);
    setSelectedSport("");
    setMinPlayers(2);
    setMaxPlayers(10);
    setEditingSubVenue(null);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-6xl mx-auto">
        {/* Header with gradient */}
        <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-xl backdrop-blur">
              <MapPin size={40} className="text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-foreground">
                Courts & Fields
              </h1>
              <p className="text-muted-foreground mt-1">Manage your playing areas and sports</p>
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

        {/* Venue Selector */}
        {venues.length > 0 && (
          <div className="mb-6 p-6 rounded-2xl bg-gradient-to-br from-card/80 to-primary/5 backdrop-blur-md border-2 border-primary/20">
            <label className="block text-foreground mb-3 font-bold flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
              Select Venue
            </label>
            <select
              value={selectedVenue?._id || ""}
              onChange={(e) => {
                const venue = venues.find((v) => v._id === e.target.value);
                setSelectedVenue(venue || null);
              }}
              className="w-full p-4 rounded-xl bg-card/80 backdrop-blur border-2 border-primary/20 hover:border-primary/40 text-foreground font-medium transition-all shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
            >
              {venues.map((venue) => (
                <option key={venue._id} value={venue._id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {venues.length === 0 ? (
          <div className="bg-white/20 backdrop-blur-md rounded-xl p-8 text-center text-white">
            <p className="text-xl mb-4">
              You need to create a venue first before adding courts/fields.
            </p>
            <Button onClick={() => (window.location.href = "/venue-dashboard/venues")}>
              Go to Venues
            </Button>
          </div>
        ) : (
          <>
            {/* Add SubVenue Button */}
            {!showForm && selectedVenue && (
              <Button
                onClick={() => setShowForm(true)}
                className="mb-6 flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 transition-all bg-gradient-to-r from-primary to-primary/80"
                size="lg"
              >
                <Plus size={20} className="animate-pulse" />
                Add Court/Field
              </Button>
            )}

            {/* Form */}
            {showForm && selectedVenue && (
              <div className="bg-gradient-to-br from-card/80 to-primary/5 backdrop-blur-md rounded-2xl border-2 border-primary/20 p-6 mb-6 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {editingSubVenue ? "Edit Court/Field" : "Create New Court/Field"}
                  </h2>
                </div>

            <form onSubmit={handleCreateOrUpdate} className="space-y-4">
              <div className="group">
                <label className="block text-foreground mb-2 font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full group-hover:animate-pulse"></span>
                  Court/Field Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full p-3 rounded-xl bg-card/80 backdrop-blur border-2 border-primary/20 hover:border-primary/40 text-foreground transition-all shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                  placeholder="e.g., Court A, Main Field"
                />
              </div>                  <div className="group">
                    <label className="block text-foreground mb-2 font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary rounded-full group-hover:animate-pulse"></span>
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      className="w-full p-3 rounded-xl bg-card/80 backdrop-blur border-2 border-primary/20 hover:border-primary/40 text-foreground transition-all shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                      placeholder="Describe this court/field..."
                    />
                  </div>

                  {/* Sports Management */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20">
                    <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                      Sports Available *
                    </h3>
                    <div className="mb-3">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                        <select
                          value={selectedSport}
                          onChange={(e) => setSelectedSport(e.target.value)}
                          className="p-3 rounded-lg bg-card/80 backdrop-blur border-2 border-primary/20 hover:border-primary/40 text-foreground font-medium transition-all shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                        >
                          <option value="">Select Sport</option>
                          {SPORTS_DISPLAY.map((sport) => (
                            <option key={sport} value={sport}>
                              {sport}
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          value={minPlayers}
                          onChange={(e) => setMinPlayers(parseInt(e.target.value))}
                          min="1"
                          className="p-3 rounded-lg bg-card/80 backdrop-blur border-2 border-primary/20 hover:border-primary/40 text-foreground transition-all shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                          placeholder="Min Players"
                        />

                        <input
                          type="number"
                          value={maxPlayers}
                          onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                          min="1"
                          className="p-3 rounded-lg bg-card/80 backdrop-blur border-2 border-primary/20 hover:border-primary/40 text-foreground transition-all shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                          placeholder="Max Players"
                        />

                        <Button
                          type="button"
                          onClick={addSport}
                          className="shadow hover:shadow-lg transition-all"
                          variant="secondary"
                        >
                          Add Sport
                        </Button>
                      </div>

                      {/* Sports List */}
                      <div className="space-y-2">
                        {sports.map((sport, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 p-3 rounded-lg"
                          >
                            <div className="flex items-center gap-3 text-foreground">
                              <span className="font-semibold">{formatSportName(sport.name)}</span>
                              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Users size={14} />
                                {sport.minPlayers} - {sport.maxPlayers} players
                              </span>
                            </div>
                            <Button
                              type="button"
                              onClick={() => removeSport(sport.name)}
                              variant="destructive"
                              size="icon"
                              className="h-8 w-8 hover:scale-110 transition-all"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      type="submit" 
                      className="flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                      size="lg"
                    >
                      {editingSubVenue ? "Update Court/Field" : "Create Court/Field"}
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

            {/* SubVenues List */}
            {selectedVenue && (
              <>
                {loading ? (
                  <div className="text-center text-white text-xl py-10">
                    Loading...
                  </div>
                ) : subVenues.length === 0 ? (
                  <div className="relative overflow-hidden bg-gradient-to-br from-card/80 to-primary/5 backdrop-blur-md rounded-2xl border-2 border-dashed border-primary/30 p-12 text-center">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/10 rounded-full -ml-12 -mb-12"></div>
                    <div className="relative">
                      <div className="inline-block p-4 bg-primary/20 rounded-full mb-4 animate-bounce">
                        <MapPin size={48} className="text-primary" />
                      </div>
                      <h3 className="text-2xl font-bold text-foreground mb-2">
                        No Courts/Fields Yet
                      </h3>
                      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        Add your first court or field to this venue to start managing bookings.
                      </p>
                      <Button
                        onClick={() => setShowForm(true)}
                        className="shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                        size="lg"
                      >
                        <Plus size={20} className="mr-2" />
                        Create Your First Court/Field
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {subVenues.map((subVenue) => (
                      <div
                        key={subVenue._id}
                        className="group relative overflow-hidden rounded-2xl border-2 border-primary/20 hover:border-primary/60 transition-all shadow-lg hover:shadow-xl bg-gradient-to-br from-card/80 to-primary/5 backdrop-blur"
                      >
                        <div className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-primary/20 rounded-lg">
                                  <MapPin className="w-5 h-5 text-primary" />
                                </div>
                                <h3 className="text-2xl font-bold text-foreground">
                                  {subVenue.name}
                                </h3>
                              </div>
                              {subVenue.description && (
                                <p className="text-muted-foreground mb-3 p-3 bg-background/50 rounded-lg">
                                  {subVenue.description}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleEdit(subVenue)}
                                variant="outline"
                                size="icon"
                                className="hover:scale-110 transition-all shadow-sm"
                              >
                                <Edit2 size={18} />
                              </Button>
                              <Button
                                onClick={() => handleDelete(subVenue._id)}
                                variant="destructive"
                                size="icon"
                                className="hover:scale-110 transition-all shadow-sm"
                              >
                                <Trash2 size={18} />
                              </Button>
                            </div>
                          </div>

                          <div className="mb-4">
                            <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                              AVAILABLE SPORTS
                            </p>
                            <div className="space-y-2">
                              {subVenue.sports.map((sport, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30"
                                >
                                  <span className="font-bold text-foreground">{sport.name}</span>
                                  <span className="text-sm text-muted-foreground bg-background/50 px-3 py-1 rounded-full flex items-center gap-1">
                                    <Users size={14} />
                                    {sport.minPlayers} - {sport.maxPlayers} players
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="pt-4 border-t border-primary/20 flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                              <span className="font-semibold text-foreground">{subVenue.sports?.length || 0}</span> sport{subVenue.sports?.length !== 1 ? 's' : ''} available
                            </p>
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                subVenue.status === "active"
                                  ? "bg-green-600/20 border border-green-600/40 text-green-100"
                                  : "bg-gray-600/20 border border-gray-600/40 text-gray-100"
                              }`}
                            >
                              {subVenue.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ManageSubVenues;

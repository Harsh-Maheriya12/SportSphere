import React, { useState, useEffect } from "react";
import { Clock, Plus, Edit2, Trash2, Calendar, IndianRupee, CheckCircle, XCircle, User, Mail } from "lucide-react";
import {
  apiGetMyVenues,
  apiGetSubVenuesByVenue,
  apiGetSlotsForSubVenue,
  apiGenerateTimeSlots,
  apiUpdateTimeSlot,
  apiDeleteTimeSlots,
} from "../../services/api";
import { Venue, SubVenue, Slot } from "../../types";
import VenueDashboardNav from "../../components/VenueDashboardNav";
import { Button } from "../../components/ui/button";

function ManageTimeSlots() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [subVenues, setSubVenues] = useState<SubVenue[]>([]);
  const [selectedSubVenue, setSelectedSubVenue] = useState<SubVenue | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [sportPrices, setSportPrices] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    loadVenues();
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
  }, []);

  useEffect(() => {
    if (selectedVenue) {
      loadSubVenues(selectedVenue._id);
    }
  }, [selectedVenue]);

  useEffect(() => {
    if (selectedSubVenue && selectedDate) {
      loadSlots();
    }
  }, [selectedSubVenue, selectedDate]);

  useEffect(() => {
    if (error) setTimeout(() => setError(""), 3000);
  }, [error]);

  useEffect(() => {
    if (success) setTimeout(() => setSuccess(""), 3000);
  }, [success]);

  const loadVenues = async () => {
    try {
      const response = await apiGetMyVenues();
      setVenues(response.venues);
      if (response.venues.length > 0) {
        setSelectedVenue(response.venues[0]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load venues");
    }
  };

  const loadSubVenues = async (venueId: string) => {
    try {
      const response = await apiGetSubVenuesByVenue(venueId);
      setSubVenues(response.subVenues);
      if (response.subVenues.length > 0) {
        setSelectedSubVenue(response.subVenues[0]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load courts/fields");
    }
  };

  const loadSlots = async () => {
    if (!selectedSubVenue || !selectedDate) return;

    try {
      setLoading(true);
      const response = await apiGetSlotsForSubVenue(
        selectedSubVenue._id,
        selectedDate
      );
      setSlots(response.timeSlot?.slots || []);
    } catch (err: any) {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSlots = async () => {
    if (!selectedSubVenue || !selectedDate) {
      setError("Please select a court/field and date");
      return;
    }

    if (
      !window.confirm(
        `Generate 24 hourly slots for ${selectedDate}? This will create blocked slots that you can configure.`
      )
    )
      return;

    try {
      await apiGenerateTimeSlots(selectedSubVenue._id, selectedDate);
      setSuccess("Time slots generated successfully!");
      loadSlots();
    } catch (err: any) {
      setError(err.message || "Failed to generate slots");
    }
  };

  const handleEditSlot = (slot: Slot) => {
    setEditingSlot(slot);
    const prices: { [key: string]: number } = {};
    selectedSubVenue?.sports.forEach((sport) => {
      prices[sport.name] = slot.prices[sport.name] || 0;
    });
    setSportPrices(prices);
    setShowPricingModal(true);
  };

  const handleSaveSlot = async () => {
    if (!editingSlot) return;

    // Check if at least one price is set
    const hasPrice = Object.values(sportPrices).some((price) => price > 0);
    if (!hasPrice) {
      setError("Please set at least one sport price");
      return;
    }

    try {
      await apiUpdateTimeSlot(
        editingSlot._id,
        sportPrices,
        "available",
        undefined
      );
      setSuccess("Slot updated successfully!");
      setShowPricingModal(false);
      setEditingSlot(null);
      setSportPrices({});
      loadSlots();
    } catch (err: any) {
      setError(err.message || "Failed to update slot");
    }
  };

  const handleBlockSlot = async (slotId: string) => {
    try {
      await apiUpdateTimeSlot(slotId, undefined, "blocked", null);
      setSuccess("Slot blocked!");
      loadSlots();
    } catch (err: any) {
      setError(err.message || "Failed to block slot");
    }
  };

  const handleDeleteSlots = async () => {
    if (!selectedSubVenue || !selectedDate) return;

    if (
      !window.confirm(
        `Delete all slots for ${selectedDate}? This cannot be undone.`
      )
    )
      return;

    try {
      await apiDeleteTimeSlots(selectedSubVenue._id, selectedDate);
      setSuccess("Slots deleted successfully!");
      loadSlots();
    } catch (err: any) {
      setError(err.message || "Failed to delete slots");
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-7xl mx-auto">
        {/* Header with gradient */}
        <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-xl backdrop-blur">
              <Clock size={40} className="text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-foreground">
                Manage Time Slots
              </h1>
              <p className="text-muted-foreground mt-1">Create and manage your venue availability</p>
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

        {venues.length === 0 ? (
          <div className="bg-white/20 backdrop-blur-md rounded-xl p-8 text-center text-white">
            <p className="text-xl mb-4">
              Create a venue first before managing time slots.
            </p>
            <Button onClick={() => (window.location.href = "/venue-dashboard/venues")}>
              Go to Venues
            </Button>
          </div>
        ) : subVenues.length === 0 ? (
          <div className="bg-white/20 backdrop-blur-md rounded-xl p-8 text-center text-white">
            <p className="text-xl mb-4">
              Add courts/fields before creating time slots.
            </p>
            <Button onClick={() => (window.location.href = "/venue-dashboard/subvenues")}>
              Go to Courts/Fields
            </Button>
          </div>
        ) : (
          <>
            {/* Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="group">
                <label className="block text-foreground mb-2 font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full group-hover:animate-pulse"></span>
                  Venue
                </label>
                <select
                  value={selectedVenue?._id || ""}
                  onChange={(e) => {
                    const venue = venues.find((v) => v._id === e.target.value);
                    setSelectedVenue(venue || null);
                  }}
                  className="w-full p-3 rounded-xl bg-card/80 backdrop-blur border-2 border-primary/20 hover:border-primary/40 text-foreground transition-all shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                >
                  {venues.map((venue) => (
                    <option key={venue._id} value={venue._id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="group">
                <label className="block text-foreground mb-2 font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full group-hover:animate-pulse"></span>
                  Court/Field
                </label>
                <select
                  value={selectedSubVenue?._id || ""}
                  onChange={(e) => {
                    const sv = subVenues.find((s) => s._id === e.target.value);
                    setSelectedSubVenue(sv || null);
                  }}
                  className="w-full p-3 rounded-xl bg-card/80 backdrop-blur border-2 border-primary/20 hover:border-primary/40 text-foreground transition-all shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                >
                  {subVenues.map((sv) => (
                    <option key={sv._id} value={sv._id}>
                      {sv.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="group">
                <label className="block text-foreground mb-2 font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full group-hover:animate-pulse"></span>
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full p-3 rounded-xl bg-card/80 backdrop-blur border-2 border-primary/20 hover:border-primary/40 text-foreground transition-all shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="bg-card/50 backdrop-blur rounded-xl border border-primary/20 p-4 mb-6">
              <div className="flex flex-wrap gap-3 items-end">
                <Button
                  onClick={handleGenerateSlots}
                  className="flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 transition-all bg-gradient-to-r from-primary to-primary/80"
                  size="lg"
                >
                  <Plus size={20} className="animate-pulse" />
                  Generate Slots
                </Button>

                {slots.length > 0 && (
                  <Button
                    onClick={handleDeleteSlots}
                    variant="destructive"
                    className="flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                    size="lg"
                  >
                    <Trash2 size={20} />
                    Delete All Slots
                  </Button>
                )}
              </div>
            </div>

            {/* Slots Display */}
            {loading ? (
              <div className="text-center text-white text-xl py-10">
                Loading slots...
              </div>
            ) : slots.length === 0 ? (
              <div className="relative overflow-hidden bg-gradient-to-br from-card/80 to-primary/5 backdrop-blur-md rounded-2xl border-2 border-dashed border-primary/30 p-12 text-center">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/10 rounded-full -ml-12 -mb-12"></div>
                <div className="relative">
                  <div className="inline-block p-4 bg-primary/20 rounded-full mb-4 animate-bounce">
                    <Calendar size={48} className="text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    No Slots Yet
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Get started by generating 24 hourly slots for this date, or add custom time slots as needed.
                  </p>
                  <Button
                    onClick={handleGenerateSlots}
                    className="shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                    size="lg"
                  >
                    <Plus size={20} className="mr-2" />
                    Generate Slots Now
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Stats Overview */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-green-600/20 to-green-600/5 backdrop-blur rounded-xl border border-green-600/30 p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-600/20 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          {slots.filter(s => s.status === 'available').length}
                        </p>
                        <p className="text-sm text-muted-foreground">Available</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-red-600/20 to-red-600/5 backdrop-blur rounded-xl border border-red-600/30 p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-600/20 rounded-lg">
                        <XCircle className="w-6 h-6 text-red-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          {slots.filter(s => s.status === 'booked').length}
                        </p>
                        <p className="text-sm text-muted-foreground">Booked</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-gray-600/20 to-gray-600/5 backdrop-blur rounded-xl border border-gray-600/30 p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-600/20 rounded-lg">
                        <Clock className="w-6 h-6 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          {slots.filter(s => s.status === 'blocked').length}
                        </p>
                        <p className="text-sm text-muted-foreground">Blocked</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {slots.map((slot) => (
                  <div
                    key={slot._id}
                    className={`group relative overflow-hidden rounded-xl border-2 transition-all shadow-sm hover:shadow-md bg-card/80 backdrop-blur ${
                      slot.status === "available"
                        ? "border-green-600/50 hover:border-green-600"
                        : slot.status === "booked"
                        ? "border-red-600/50 hover:border-red-600"
                        : "border-primary/20 hover:border-primary/40"
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-5 h-5 text-primary" />
                          <div>
                            <div className="font-bold text-lg text-foreground">
                              {formatTime(slot.startTime)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              to {formatTime(slot.endTime)}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                            slot.status === "available"
                              ? "bg-green-600/20 text-green-400 border border-green-600/40"
                              : slot.status === "booked"
                              ? "bg-red-600/20 text-red-400 border border-red-600/40"
                              : "bg-gray-600/20 text-gray-400 border border-gray-600/40"
                          }`}
                        >
                          {slot.status === "available" && <CheckCircle className="w-3 h-3" />}
                          {slot.status === "booked" && <XCircle className="w-3 h-3" />}
                          {slot.status.toUpperCase()}
                        </span>
                      </div>

                      {slot.status !== "blocked" && (
                        <div className="space-y-2 mb-3 p-3 bg-background/50 rounded-lg">
                          {selectedSubVenue?.sports.map((sport) => (
                            <div
                              key={sport.name}
                              className="flex justify-between items-center text-sm"
                            >
                              <span className="text-muted-foreground">{sport.name}</span>
                              <div className="flex items-center gap-1">
                                {slot.prices[sport.name] ? (
                                  <>
                                    <IndianRupee className="w-3 h-3 text-green-500" />
                                    <span className="font-bold text-green-500">{slot.prices[sport.name]}</span>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground/50 text-xs">Not set</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {slot.status === "booked" && (
                        <div className="mb-3 p-3 bg-red-600/10 border-l-2 border-red-500 rounded-lg space-y-2">
                          {slot.bookedForSport && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="px-2 py-1 bg-primary/20 text-primary rounded text-xs font-semibold">
                                {slot.bookedForSport}
                              </span>
                            </div>
                          )}
                          {slot.bookedBy && (
                            <div className="space-y-1">
                              {(() => {
                                const b: any = slot.bookedBy;
                                const username = b?.username;
                                const email = b?.email;
                                return (
                                  <>
                                    {username && (
                                      <div className="flex items-center gap-2 text-sm text-foreground">
                                        <User className="w-4 h-4 text-primary" />
                                        <span className="font-semibold">{username}</span>
                                      </div>
                                    )}
                                    {email && (
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Mail className="w-3 h-3 text-primary" />
                                        <span>{email}</span>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        {slot.status !== "booked" && (
                          <>
                            <Button
                              onClick={() => handleEditSlot(slot)}
                              className="flex-1 flex items-center justify-center gap-1 shadow-sm hover:shadow-md transition-all"
                              size="sm"
                            >
                              <Edit2 size={14} />
                              Set Price
                            </Button>
                            {slot.status !== "blocked" && (
                              <Button
                                onClick={() => handleBlockSlot(slot._id)}
                                variant="secondary"
                                className="flex-1 shadow-sm hover:shadow-md transition-all"
                                size="sm"
                              >
                                Block
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              </>
            )}
          </>
        )}

        {/* Pricing Modal */}
        {showPricingModal && editingSlot && selectedSubVenue && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-gradient-to-br from-card to-card/95 backdrop-blur-xl rounded-2xl p-6 max-w-md w-full border-2 border-primary/30 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <IndianRupee className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">
                  Set Prices
                </h3>
              </div>
              <div className="flex items-center gap-2 mb-6 p-3 bg-primary/10 rounded-lg">
                <Clock className="w-4 h-4 text-primary" />
                <p className="text-foreground font-medium">
                  {formatTime(editingSlot.startTime)} -{" "}
                  {formatTime(editingSlot.endTime)}
                </p>
              </div>

              <div className="space-y-4 mb-6">
                {selectedSubVenue.sports.map((sport) => (
                  <div key={sport.name} className="group">
                    <label className="block text-foreground mb-2 font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary rounded-full group-hover:animate-pulse"></span>
                      {sport.name}
                      <span className="text-xs text-muted-foreground">(₹/hour)</span>
                    </label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="number"
                        value={sportPrices[sport.name] || ""}
                        onChange={(e) =>
                          setSportPrices({
                            ...sportPrices,
                            [sport.name]: parseInt(e.target.value) || 0,
                          })
                        }
                        min="0"
                        className="w-full pl-10 p-3 rounded-xl bg-background/80 backdrop-blur border-2 border-primary/20 hover:border-primary/40 focus:border-primary text-foreground transition-all shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                        placeholder="Enter price"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleSaveSlot} 
                  className="flex-1 shadow-sm hover:shadow-md transition-all"
                  size="lg"
                >
                  Save & Make Available
                </Button>
                <Button
                  onClick={() => {
                    setShowPricingModal(false);
                    setEditingSlot(null);
                    setSportPrices({});
                  }}
                  variant="secondary"
                  className="flex-1 shadow-sm hover:shadow-md transition-all"
                  size="lg"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ManageTimeSlots;

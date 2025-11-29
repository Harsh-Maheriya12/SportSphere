import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  apiGetVenueById,
  apiGetSubVenuesByVenue,
  apiGetSlotsForSubVenue,
  apiBookVenueSlot,
} from "../services/api";
import { Venue, SubVenue, Slot } from "../types";
import { Clock, IndianRupee, CalendarCheck2, ChevronLeft, MapPin, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";
import Plasma from "../components/background/Plasma";

type SlotsBySubVenue = Record<string, { slots: Slot[]; timeSlotDocId: string }>;

const formatSportName = (sport: string) => {
  if (sport.toLowerCase() === "tabletennis") return "Table Tennis";
  return sport
    .split(/(?=[A-Z])|\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export default function TimeSlotBooking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [venue, setVenue] = useState<Venue | null>(null);
  const [subVenues, setSubVenues] = useState<SubVenue[]>([]);
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [selectedGroundId, setSelectedGroundId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState("");
  const [slotsBySubVenue, setSlotsBySubVenue] = useState<SlotsBySubVenue>({});
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState("");

  // Load venue + subvenues
  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const [venueRes, subRes] = await Promise.all([
          apiGetVenueById(id),
          apiGetSubVenuesByVenue(id),
        ]);
        setVenue(venueRes.venue);
        setSubVenues(subRes.subVenues);
        const today = new Date().toISOString().split("T")[0];
        setSelectedDate(today);
      } catch (e: any) {
        setError(e.message || "Failed to load venue");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // Fetch slots for all subvenues that support the selected sport
  useEffect(() => {
    const fetchAll = async () => {
      if (!selectedSport || !selectedDate) {
        setSlotsBySubVenue({});
        return;
      }

      const supporting = subVenues.filter((sv) =>
        sv.sports.some((s) => s.name === selectedSport)
      );

      if (supporting.length === 0) {
        setSlotsBySubVenue({});
        return;
      }

      try {
        setLoadingSlots(true);
        const entries = await Promise.all(
          supporting.map(async (sv) => {
            try {
              const res = await apiGetSlotsForSubVenue(sv._id, selectedDate);
              return [sv._id, { slots: res.timeSlot?.slots || [], timeSlotDocId: res.timeSlot?._id || "" }] as [string, { slots: Slot[]; timeSlotDocId: string }];
            } catch {
              return [sv._id, { slots: [], timeSlotDocId: "" }] as [string, { slots: Slot[]; timeSlotDocId: string }];
            }
          })
        );
        const map: SlotsBySubVenue = {};
        entries.forEach(([k, v]) => (map[k] = v));
        setSlotsBySubVenue(map);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchAll();
  }, [selectedSport, selectedDate, subVenues]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: 'IST' });
  };

  const handleBook = async (slot: Slot, subVenueId: string, subVenueName: string) => {
    if (!selectedSport) return;
    if (slot.status !== "available" || !slot.prices[selectedSport]) return;

    const slotData = slotsBySubVenue[subVenueId];
    if (!slotData || !slotData.timeSlotDocId) {
      alert("Unable to book: missing time slot information");
      return;
    }

    const confirmMsg = `Book this slot?\n\nVenue: ${venue?.name}\nCourt: ${subVenueName}\nSport: ${selectedSport}\nDate: ${selectedDate}\nTime: ${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}\nPrice: ₹${slot.prices[selectedSport]}`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const response = await apiBookVenueSlot(subVenueId, slotData.timeSlotDocId, slot._id, selectedSport);
      // Redirect to Stripe checkout
      if (response.url) {
        window.location.href = response.url;
      } else {
        alert("Booking created but no payment URL received");
      }
    } catch (e: any) {
      alert(e.message || "Booking failed");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-2xl font-semibold text-white">Loading venue details...</div>
        </div>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="min-h-screen bg-background">
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-2xl font-semibold text-red-400 mb-6">{error || "Venue not found"}</div>
            <button
              onClick={() => navigate("/venues")}
              className="bg-card/80 backdrop-blur-sm border border-primary/30 text-foreground px-8 py-3 rounded-xl font-semibold hover:bg-card transition-all"
            >
              Back to Venues
            </button>
          </div>
        </div>
      </div>
    );
  }

  const venueSports = venue.sports || [];
  const filteredSubVenues = selectedSport
    ? subVenues.filter((sv) => sv.sports.some((s) => s.name === selectedSport))
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">

        {/* Back Button */}
        <Link
          to={`/venue/${id}`}
          className="mb-4 inline-flex items-center gap-2 bg-card/80 backdrop-blur-sm border border-primary/30 text-foreground px-3 py-2 rounded-lg text-sm hover:bg-card transition-all"
        >
          <ChevronLeft size={18} />
          Back to Venue
        </Link>

        {/* Header Card */}
        <div className="bg-card/80 backdrop-blur-sm border border-primary/20 rounded-xl p-6 mb-6 shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2 flex items-center gap-2">
                <Sparkles className="text-primary" size={32} />
                Book Your Slot
              </h1>
              <h2 className="text-xl font-semibold text-foreground mb-1">{venue.name}</h2>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin size={16} />
                <p className="text-sm">{venue.city}, {venue.address}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Booking Card */}
        <div className="bg-card/80 backdrop-blur-sm border border-primary/20 rounded-xl p-6 shadow-xl">

          {/* Step 1: Select Sport */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground mb-3">Step 1: Select Sport</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {venueSports.map((sport) => (
                <button
                  key={sport}
                  className={`px-4 py-3 rounded-lg font-semibold transition-all ${selectedSport === sport
                    ? "button-style1 shadow-lg scale-105"
                    : "bg-card/60 backdrop-blur-sm border border-primary/30 text-foreground hover:bg-card"
                    }`}
                  onClick={() => {
                    setSelectedSport(sport);
                    setSelectedGroundId("");
                  }}
                >
                  {formatSportName(sport)}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Select Date */}
          <div className="mb-6">
            <label className="block text-xl font-bold text-foreground mb-3">Step 2: Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="p-3 rounded-lg bg-card/50 backdrop-blur-sm border border-primary/40 text-foreground font-semibold focus:ring-2 focus:ring-primary focus:outline-none w-full sm:w-auto"
            />
          </div>

          {/* Step 3: Optional Ground filter */}
          {selectedSport && filteredSubVenues.length > 0 && (
            <div className="mb-6">
              <label className="block text-lg font-bold text-foreground mb-3">Step 3: Filter by Court/Field (optional)</label>
              <div className="flex flex-wrap gap-2">
                <button
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${selectedGroundId === ""
                    ? "bg-green-600 text-white shadow-md"
                    : "bg-card/60 backdrop-blur-sm border border-primary/30 text-foreground hover:bg-card"
                    }`}
                  onClick={() => setSelectedGroundId("")}
                >
                  All Courts
                </button>
                {filteredSubVenues.map((sv) => (
                  <button
                    key={sv._id}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${selectedGroundId === sv._id
                      ? "bg-green-600 text-white shadow-md"
                      : "bg-card/60 backdrop-blur-sm border border-primary/30 text-foreground hover:bg-card"
                      }`}
                    onClick={() => setSelectedGroundId(sv._id)}
                  >
                    {sv.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Show available slots */}
          {selectedSport && (
            <>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CalendarCheck2 size={24} className="text-primary" />
                Available Slots for {formatSportName(selectedSport)}
              </h2>

              {loadingSlots && (
                <div className="text-muted-foreground py-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary/30 border-t-primary"></div>
                  <p className="mt-3">Loading slots...</p>
                </div>
              )}

              {!loadingSlots && filteredSubVenues.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">No courts/fields for this sport at this venue.</div>
              )}

              {!loadingSlots && filteredSubVenues.length > 0 && (
                <div className="space-y-6">
                  {filteredSubVenues
                    .filter((sv) => (selectedGroundId ? sv._id === selectedGroundId : true))
                    .map((sv) => {
                      const allSlots = slotsBySubVenue[sv._id]?.slots || [];
                      const myBooked = allSlots.filter((slot: Slot) => {
                        if (slot.status !== "booked") return false;
                        const b: any = slot.bookedBy;
                        const bookedId = typeof b === "string" ? b : (b?._id || b?.id);
                        return user && bookedId && bookedId.toString() === user.id;
                      });
                      const slots = allSlots.filter(
                        (slot: Slot) => slot.status === "available" && slot.prices[selectedSport]
                      );
                      return (
                        <div key={sv._id} className="bg-card/50 backdrop-blur-sm rounded-xl p-5 border border-primary/20">
                          <h3 className="text-lg font-bold text-foreground mb-3">{sv.name}</h3>

                          {myBooked.length > 0 && (
                            <div className="mb-4 p-3 bg-green-500/10 backdrop-blur-sm border border-green-400/30 rounded-lg">
                              <div className="font-semibold text-foreground mb-2 text-sm">✓ Your booked slots:</div>
                              <div className="flex flex-wrap gap-2">
                                {myBooked.map((slot: Slot) => (
                                  <span key={slot._id} className="px-3 py-1 rounded-lg bg-green-600/60 text-white text-sm font-medium">
                                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {slots.length === 0 ? (
                            <div className="text-muted-foreground text-center py-4">No available slots for this date.</div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                              {slots.map((slot: Slot) => (
                                <div
                                  key={slot._id}
                                  className="group relative overflow-hidden rounded-lg border-2 border-primary/20 hover:border-primary/60 transition-all shadow-md bg-card/60 backdrop-blur-sm hover:bg-card/80 flex flex-col justify-between"
                                >
                                  <div className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Clock className="w-4 h-4 text-primary" />
                                      <span className="font-semibold text-foreground text-sm">
                                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 mb-2">
                                      <IndianRupee className="w-4 h-4 text-green-400" />
                                      <span className="text-green-400 font-bold text-lg">
                                        {slot.prices[selectedSport]}
                                      </span>
                                      <span className="text-xs text-muted-foreground">/hr</span>
                                    </div>
                                  </div>
                                  <div className="p-3 pt-0">
                                    <button
                                      className="w-full button-style1 py-2 rounded-lg font-semibold text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all"
                                      onClick={() => handleBook(slot, sv._id, sv.name)}
                                    >
                                      Book Now
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

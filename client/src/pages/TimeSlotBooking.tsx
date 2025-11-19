import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  apiGetVenueById,
  apiGetSubVenuesByVenue,
  apiGetSlotsForSubVenue,
  apiBookVenueSlot,
} from "../services/api";
import { Venue, SubVenue, Slot } from "../types";
import { Clock, IndianRupee, CalendarCheck2 } from "lucide-react";
import { Button } from "../components/ui/button";

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
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
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
      <div className="min-h-screen p-8 bg-white/10 text-white flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="min-h-screen p-8 bg-white/10 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl text-red-400 mb-4">{error || "Venue not found"}</div>
          <button onClick={() => navigate("/venues")} className="bg-primary px-6 py-2 rounded-xl">
            Back to Venues
          </button>
        </div>
      </div>
    );
  }

  const venueSports = venue.sports || [];
  const filteredSubVenues = selectedSport
    ? subVenues.filter((sv) => sv.sports.some((s) => s.name === selectedSport))
    : [];

  return (
    <div className="min-h-screen p-8 bg-white/10 text-white">
      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-2">Book Your Slot</h1>
        <h2 className="text-2xl text-white/80">{venue.name}</h2>
        <p className="text-white/60">
          {venue.city}, {venue.address}
        </p>
      </div>

      {/* Step 1: Select Sport */}
      <h2 className="text-2xl mb-3">Select Sport</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {venueSports.map((sport) => (
          <Button
            key={sport}
            variant={selectedSport === sport ? "default" : "outline"}
            size="lg"
            className={`w-full ${selectedSport === sport ? "bg-blue-600 text-white" : ""}`}
            onClick={() => {
              setSelectedSport(sport);
              setSelectedGroundId("");
            }}
          >
            {formatSportName(sport)}
          </Button>
        ))}
      </div>

      {/* Step 2: Select Date */}
      <div className="mb-8">
        <label className="block text-xl font-semibold mb-3">Select Date</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
          className="p-3 rounded-xl bg-white/20 backdrop-blur border border-white/30 text-white"
        />
      </div>

      {/* Step 3: Optional Ground filter when a sport is selected */}
      {selectedSport && filteredSubVenues.length > 0 && (
        <div className="mb-6">
          <label className="block text-lg font-semibold mb-2">Filter by Court/Field (optional)</label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedGroundId === "" ? "default" : "outline"}
              size="sm"
              className={`mr-2 ${selectedGroundId === "" ? "bg-green-600 text-white" : ""}`}
              onClick={() => setSelectedGroundId("")}
            >
              All
            </Button>
            {filteredSubVenues.map((sv) => (
              <Button
                key={sv._id}
                variant={selectedGroundId === sv._id ? "default" : "outline"}
                size="sm"
                className={`mr-2 ${selectedGroundId === sv._id ? "bg-green-600 text-white" : ""}`}
                onClick={() => setSelectedGroundId(sv._id)}
              >
                {sv.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Show available slots grouped by ground */}
      {selectedSport && (
        <>
          <h2 className="text-2xl mb-3">Available Slots for {formatSportName(selectedSport)}</h2>
          {loadingSlots && <div className="text-white/70 py-4">Loading slots...</div>}
          {!loadingSlots && filteredSubVenues.length === 0 && (
            <div className="text-white/70 py-4">No courts/fields for this sport at this venue.</div>
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
                    <div key={sv._id}>
                      <h3 className="text-xl font-semibold mb-2">{sv.name}</h3>

                      {myBooked.length > 0 && (
                        <div className="mb-3 text-white/90">
                          <div className="font-semibold mb-1">Your booked slots:</div>
                          <div className="flex flex-wrap gap-2">
                            {myBooked.map((slot: Slot) => (
                              <span key={slot._id} className="px-3 py-1 rounded-lg bg-green-700/60">
                                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {slots.length === 0 ? (
                        <div className="text-white/60">No available slots for this date.</div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {slots.map((slot: Slot) => (
                            <div
                              key={slot._id}
                              className="group relative overflow-hidden rounded-xl border-2 border-primary/20 hover:border-primary transition-all shadow-sm bg-card/80 backdrop-blur flex flex-col justify-between"
                            >
                              <div className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Clock className="w-5 h-5 text-primary" />
                                  <span className="font-semibold text-lg">
                                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                  <IndianRupee className="w-4 h-4 text-green-500" />
                                  <span className="text-green-500 font-bold text-lg">
                                    ₹{slot.prices[selectedSport]}
                                  </span>
                                  <span className="text-xs text-muted-foreground">/hr</span>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                  <CalendarCheck2 className="w-4 h-4 text-blue-500" />
                                  <span className="text-sm text-muted-foreground">{selectedDate}</span>
                                </div>
                              </div>
                              <div className="p-4 pt-0">
                                <Button
                                  className="w-full shadow-sm hover:shadow-md transition-all"
                                  onClick={() => handleBook(slot, sv._id, sv.name)}
                                >
                                  Book Slot
                                </Button>
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
  );
}

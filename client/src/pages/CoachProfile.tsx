import React from "react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  apiGetCoachProfile,
  apiGetCoachSlots,
  apiRequestCoachBooking,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import {
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  X,
  User,
  Calendar1,
  CheckCircle,
} from "lucide-react";

interface CoachDetail {
  id: string;
  username: string;
  email: string;
  profilePhoto: string;
  age: number;
  gender: string;
  sports: string[];
  location: {
    city: string;
    state: string;
    country: string;
    address: string;
  };
  description: string;
  experience: number;
  pricing: number;
  photoGallery: string[];
}

interface Slot {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

function CoachProfile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [coach, setCoach] = useState<CoachDetail | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const navigate = useNavigate();

  // Remove Error Message
  useEffect(() => {
    if (error?.length > 0) {
      {
        setTimeout(() => setError(""), 3000);
      }
    }
  }, [error]);

  // Remove Success Message
  useEffect(() => {
    if (success?.length > 0) {
      {
        setTimeout(() => setSuccess(""), 3000);
      }
    }
  }, [success]);

  // Fetch Coach Data by ID
  const fetchCoachData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const [coachResponse, slotsResponse] = await Promise.all([
        apiGetCoachProfile(id),
        apiGetCoachSlots(id),
      ]);

      setCoach(coachResponse.coach);
      setSlots(slotsResponse.slots);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoachData();
  }, [id]);

  // Handle Book Slot
  const handleBookSlot = async () => {
    // Navigate to login if not logged in
    if (!user) {
      return navigate("/login");
    }

    if (!selectedSlot) {
      setError("Please select a time slot");
      return;
    }

    if (user?.role !== "player") {
      setError("Only players can book coaching sessions");
      return;
    }

    try {
      setError("");
      const response = await apiRequestCoachBooking(selectedSlot);
      setSuccess(response.message);
      setSelectedSlot(null);

      if (id) {
        const slotsResponse = await apiGetCoachSlots(id);
        setSlots(slotsResponse.slots);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const scrollGallery = (direction: "left" | "right") => {
    const container = document.getElementById("gallery-container");
    if (!container) return;

    const scrollAmount = 300;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-white/10">
        <p className="text-foreground">Loading coach profile...</p>
      </div>
    );
  }

  if (!coach) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-white/10">
        <p className="text-foreground">Coach not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white/10 p-4 md:p-6">
      <div className="max-w-5xl mx-auto bg-card/80 backdrop-blur rounded-2xl shadow-lg border border-primary/20 overflow-hidden">
        <div className="p-6 md:p-8 space-y-8">
          {/* Coach Details */}

          <section className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
              {/* Coach Photo */}
              <div className="md:col-span-2">
                <img
                  src={coach.profilePhoto || "/placeholder.svg"}
                  alt={coach.username}
                  className="w-full h-auto rounded-xl object-cover border border-primary/20 shadow-md hover:shadow-lg transition-shadow"
                />
              </div>

              <div className="md:col-span-3 space-y-6">
                {/* Username */}
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                    {coach.username}
                  </h1>
                  <p className="text-muted-foreground text-lg mt-2">
                    {/* Age */}
                    <Calendar1 className="inline w-4 h-4 mr-2 text-primary" />
                    {coach.age} yrs
                    {/* Gender */}
                    <User className="inline w-4 h-4 mr-2 ml-4 text-primary" />
                    {coach.gender.charAt(0).toUpperCase() +
                      coach.gender.slice(1)}
                  </p>
                </div>

                {/* Sports */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Specialties
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {coach.sports.map((sport, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-full border border-primary/20"
                      >
                        {sport}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Location */}
                {coach.location &&
                  (coach.location.city || coach.location.state) && (
                    <div className="space-y-2">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-foreground/80">
                            {coach.location.city}, {coach.location.state},
                            {coach.location.country}
                          </p>
                          {coach.location.address && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {coach.location.address}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                {/* Description */}
                {coach.description && (
                  <div className="pt-6 border-t border-primary/20">
                    <p className="text-foreground/90 leading-relaxed">
                      {coach.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="border-t border-primary/20"></div>

          {/* Photo Gallery */}
          {coach.photoGallery && coach.photoGallery.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Photo Gallery
              </h2>

              <div className="relative">
                <div
                  id="gallery-container"
                  className="flex gap-4 overflow-x-auto pb-2 scroll-smooth"
                >
                  {coach.photoGallery.map((photo, index) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`${coach.username} - ${index + 1}`}
                      className="h-56 w-auto flex-shrink-0 object-cover rounded-lg border border-primary/20 hover:shadow-lg transition-shadow cursor-pointer"
                    />
                  ))}
                </div>

                {coach.photoGallery.length > 3 && (
                  <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none">
                    <button
                      onClick={() => scrollGallery("left")}
                      className="pointer-events-auto left-2 md:left-4 bg-primary hover:bg-primary/90 text-primary-foreground p-2.5 rounded-full shadow-lg transition-all"
                      aria-label="Scroll left"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => scrollGallery("right")}
                      className="pointer-events-auto right-2 md:right-4 bg-primary hover:bg-primary/90 text-primary-foreground p-2.5 rounded-full shadow-lg transition-all"
                      aria-label="Scroll right"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          <div className="border-t border-primary/20"></div>

          {/* Slots*/}
          <section className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Available Slots
            </h2>

            {/*Error*/}
            {error && (
              <div className="bg-destructive/20 border-l-4 border-destructive text-foreground p-4 rounded-lg flex items-center space-x-2 m-4">
                <div className="shrink-0 w-1 h-4 bg-destructive rounded-full" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            {/*Success*/}
            {success && (
              <div className="bg-green-500/20 border-l-4 border-green-500 text-foreground p-4 rounded-lg flex items-center space-x-2 m-4">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <p className="text-sm font-medium">{success}</p>
              </div>
            )}

            {slots.length === 0 ? (
              <div className="text-center py-12 bg-card/50 rounded-lg border border-primary/20">
                <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No available slots at the moment. Check back later.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {slots.map((slot) => (
                    <div
                      key={slot._id}
                      onClick={() =>
                        !slot.isBooked && setSelectedSlot(slot._id)
                      }
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedSlot === slot._id
                          ? "border-primary bg-primary/10"
                          : slot.isBooked
                          ? "border-primary/20 bg-card/50 opacity-50 cursor-not-allowed"
                          : "border-primary/20 hover:border-primary/50 hover:bg-card/70"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="font-medium text-foreground text-sm">
                          {formatDate(slot.date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="text-sm text-foreground/80">
                          {slot.startTime} - {slot.endTime}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    onClick={handleBookSlot}
                    disabled={!selectedSlot}
                    className="px-6 py-3 text-base font-semibold w-full sm:w-auto border-transparent button-style1"
                  >
                    Send Request
                  </Button>

                  {selectedSlot && (
                    <Button
                      onClick={() => setSelectedSlot(null)}
                      variant="outline"
                      className="flex items-center gap-2 rounded-xl"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </Button>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default CoachProfile;

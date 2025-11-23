// src/pages/HostGame.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";

import {
  apiGetAllVenues,
  apiGetSubVenuesByVenue,
  apiGetSlotsForSubVenue,
  apiHostGame,
} from "../services/api";

import Stepper from "../components/hostgame/Stepper";
import SportPicker from "../components/hostgame/SportPicker";
import VenueSearch from "../components/hostgame/VenueSearch";
import SubVenueList from "../components/hostgame/SubVenueList";
import SlotPicker from "../components/hostgame/SlotPicker";
import PlayersForm from "../components/hostgame/PlayersForm";

import { MapPin, Clock, Trophy, Users, Check, ChevronLeft, ChevronRight } from "lucide-react";

// import your enum — adjust path if your file is elsewhere
import { SportsEnum } from "@/constants/SportsEnum";

type Venue = any;
type SubVenue = any;
type Slot = any;

const HostGame: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const steps = ["Sport & Location", "Venue", "Court/Field", "Slot", "Players & Summary"];
  const [currentStep, setCurrentStep] = useState(0);

  // Core state
  const [rawSport, setRawSport] = useState<string>(""); // whatever SportPicker returns (could be display name or key)
  const [sportKey, setSportKey] = useState<string>(""); // canonical enum key, e.g. 'football'
  const [city, setCity] = useState("");
  const [debouncedCity, setDebouncedCity] = useState("");

  const [allVenues, setAllVenues] = useState<Venue[]>([]);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(false);

  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [subVenues, setSubVenues] = useState<SubVenue[]>([]);
  const [selectedSubVenue, setSelectedSubVenue] = useState<SubVenue | null>(null);

  // Initialize date to today in YYYY-MM-DD format
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  const [timeSlotsDoc, setTimeSlotsDoc] = useState<any | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [minPlayers, setMinPlayers] = useState<number | "">("");
  const [maxPlayers, setMaxPlayers] = useState<number | "">("");
  const [description, setDescription] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  
  // Reset all form values to initial state
  
  const resetForm = () => {
    setCurrentStep(0);
    setRawSport("");
    setSportKey("");
    setCity("");
    setDebouncedCity("");
    setSelectedVenue(null);
    setSubVenues([]);
    setSelectedSubVenue(null);
    setDate(new Date().toISOString().split("T")[0]);
    setTimeSlotsDoc(null);
    setSelectedSlot(null);
    setMinPlayers("");
    setMaxPlayers("");
    setDescription("");
    setMessage(null);
  };

  // Reset form when component mounts (new game hosting)
  useEffect(() => {
    resetForm();
  }, []); // Empty dependency array - only runs on mount

  // Helper: canonicalize sport input to enum key
  // - Accepts values from SportPicker (display name or key)
  // - Returns enum value (e.g. 'football') or empty string if not found
  const getSportKeyFromInput = (input: string) => {
    if (!input) return "";
    const val = input.trim();

    // 1) If input already matches one of enum values (case-sensitive or case-insensitive)
    const enumValues = Object.values(SportsEnum); // e.g. ['cricket','football',...]
    const foundExact = enumValues.find((e) => e === val || e.toLowerCase() === val.toLowerCase());
    if (foundExact) return foundExact;

    // 2) If input looks like display name (e.g., "Football", "Table Tennis"), try mapping:
    // transform input to lower + remove spaces/underscores to compare with enum keys
    const normalized = val.toLowerCase().replace(/\s+/g, "").replace(/[_-]+/g, "");
    for (const e of enumValues) {
      const normalizedEnum = e.toLowerCase().replace(/\s+/g, "").replace(/[_-]+/g, "");
      if (normalized === normalizedEnum) return e;
    }

    // 3) Try mapping display-name-like (capitalized) to enum by matching start
    // e.g., "Table Tennis" -> "tabletennis"
    const fallback = enumValues.find((e) => e.toLowerCase().includes(normalized) || normalized.includes(e.toLowerCase()));
    if (fallback) return fallback;

    return "";
  };


  // Helper: robust check whether a venue/subvenue supports a sportKey
  // sportsField can be:
  // - array of strings (keys or display names)
  // - array of objects { key?, name?, ... }
  const supportsSport = (sportsField: any, sportToMatch: string) => {
    if (!sportToMatch || !sportsField) return false;
    if (!Array.isArray(sportsField)) return false;

    const sportNormalized = sportToMatch.trim().toLowerCase();

    return sportsField.some((s: any) => {
      if (!s) return false;

      // If it's a string — could be key or display name
      if (typeof s === "string") {
        if (s.trim().toLowerCase() === sportNormalized) return true;
        // compare display name forms (Football vs football)
        if (s.trim().toLowerCase().replace(/\s+/g, "") === sportNormalized.replace(/\s+/g, "")) return true;
        return false;
      }

      // If it's an object with key or name
      if (typeof s === "object") {
        if (s.key && s.key.toString().toLowerCase() === sportNormalized) return true;
        if (s.name && s.name.toString().toLowerCase() === sportNormalized) return true;
        // compare normalized name->key
        if (s.name && s.name.toString().toLowerCase().replace(/\s+/g, "") === sportNormalized.replace(/\s+/g, "")) return true;
        return false;
      }

      return false;
    });
  };

  // Helper: price lookup tolerant to Map/object keyed by enum key or display name
  const getSlotPriceForSport = (slot: any, sportToUse: string) => {
    if (!slot || !sportToUse) return null;
    const key = sportToUse;

    // 1) Map-like .get
    if (slot.prices && typeof slot.prices.get === "function") {
      const v = slot.prices.get(key);
      if (v !== undefined) return v;
      // try with display-name form (capitalize words)
      const display = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ");
      const v2 = slot.prices.get(display);
      if (v2 !== undefined) return v2;
    }

    // 2) Object lookup
    if (slot.prices && typeof slot.prices === "object") {
      if (slot.prices[key] !== undefined) return slot.prices[key];

      // try display-name variant: 'football' -> 'Football'
      const display = key.replace(/_/g, " ");
      const displayCap = display
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      if (slot.prices[display] !== undefined) return slot.prices[display];

      // try lowercase without spaces
      const compact = key.replace(/\s+/g, "").toLowerCase();
      for (const k of Object.keys(slot.prices)) {
        if (k.toString().toLowerCase().replace(/\s+/g, "") === compact) return slot.prices[k];
      }
    }

    return null;
  };

  // Keep rawSport and derived sportKey in sync
  // SportPicker might emit display name or key, so we canonicalize
  useEffect(() => {
    const k = getSportKeyFromInput(rawSport);
    setSportKey(k);
  }, [rawSport]);

  // Debounce city input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCity(city.trim()), 450);
    return () => clearTimeout(t);
  }, [city]);

  // -------------------------------------------------------------
  // Load all venues
  // -------------------------------------------------------------
  useEffect(() => {
    const load = async () => {
      setLoadingVenues(true);
      try {
        const res = await apiGetAllVenues();
        if (res?.venues) setAllVenues(res.venues);
      } catch (err: any) {
        setMessage(err?.message || "Failed to load venues");
      } finally {
        setLoadingVenues(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    let v = [...allVenues];

    if (sportKey) {
      v = v.filter((venue) => supportsSport(venue.sports, sportKey));
    } else if (rawSport) {
      // if canonical key couldn't be found, fall back to rawSport matching (defensive)
      v = v.filter((venue) => supportsSport(venue.sports, rawSport));
    }

    if (debouncedCity) {
      const c = debouncedCity.toLowerCase();
      v = v.filter((venue) => typeof venue.city === "string" && venue.city.toLowerCase().includes(c));
    }

    setFilteredVenues(v);
  }, [sportKey, rawSport, debouncedCity, allVenues]);

  
  // Load subvenues after venue select
  // - filter subvenues using supportsSport to handle inconsistency
  useEffect(() => {
    if (!selectedVenue) {
      setSubVenues([]);
      setSelectedSubVenue(null);
      return;
    }
    const load = async () => {
      try {
        const res = await apiGetSubVenuesByVenue(selectedVenue._id);
        const got = res?.subVenues ?? [];
        // filter by sportKey if available, else fall back to rawSport match
        const filtered = got.filter((sv: any) => {
          return sportKey ? supportsSport(sv.sports, sportKey) : (rawSport ? supportsSport(sv.sports, rawSport) : true);
        });
        setSubVenues(filtered);
        setSelectedSubVenue(null);
        setSelectedSlot(null);
      } catch (err: any) {
        setMessage(err?.message || "Failed to load courts");
      }
    };
    load();
  }, [selectedVenue, sportKey, rawSport]);

  // Load slots when sub venue + date selected
  
  useEffect(() => {
    if (!selectedSubVenue) {
      setTimeSlotsDoc(null);
      setSelectedSlot(null);
      return;
    }

    const load = async () => {
      try {
        const res = await apiGetSlotsForSubVenue(selectedSubVenue._id, date);
        setTimeSlotsDoc(res?.timeSlot ?? null);
        setSelectedSlot(null);
      } catch (err: any) {
        setMessage(err?.message || "Failed to load slots");
      }
    };
    load();
  }, [selectedSubVenue, date]);


  // Player rules: try to read from subvenue.sports object if available,

  const sportRules = useMemo(() => {
    if (!selectedSubVenue) return undefined;
    const items = selectedSubVenue.sports ?? [];
    // try object with name/key
    const found = items.find((s: any) => {
      if (!s) return false;
      if (typeof s === "string") {
        return (sportKey && s.toLowerCase() === sportKey.toLowerCase()) || (rawSport && s.toLowerCase() === rawSport.toLowerCase());
      }
      if (typeof s === "object") {
        if (s.key && sportKey && s.key.toLowerCase() === sportKey.toLowerCase()) return true;
        if (s.name && rawSport && s.name.toLowerCase() === rawSport.toLowerCase()) return true;
        return false;
      }
      return false;
    });
    return found;
  }, [selectedSubVenue, sportKey, rawSport]);

  // Step Navigation rules
  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case 0:
        // require either canonical sport key (preferred) or rawSport non-empty
        return (!!sportKey || !!rawSport) && !!debouncedCity;
      case 1:
        return !!selectedVenue;
      case 2:
        return !!selectedSubVenue;
      case 3:
        return !!selectedSlot;
      case 4:
        return minPlayers !== "" && maxPlayers !== "" && Number(minPlayers) > 0;
      default:
        return true;
    }
  }, [currentStep, sportKey, rawSport, debouncedCity, selectedVenue, selectedSubVenue, selectedSlot, minPlayers, maxPlayers]);

  const next = () => setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  const prev = () => setCurrentStep((s) => Math.max(s - 1, 0));

 
  const handleHost = async () => {
    setMessage(null);
    if (!isAuthenticated) return setMessage("Login required to host.");

    if (!selectedVenue || !selectedSubVenue || !selectedSlot) return setMessage("Complete all steps.");

    if (minPlayers === "" || maxPlayers === "") return setMessage("Enter min and max players.");
    const min = Number(minPlayers);
    const max = Number(maxPlayers);
    if (isNaN(min) || isNaN(max)) return setMessage("Invalid player numbers");
    if (min > max) return setMessage("Min players cannot exceed max players.");

    // validate against subvenue rules if available (sportRules)
    if (sportRules) {
      if (sportRules.minPlayers !== undefined && min < sportRules.minPlayers) return setMessage(`Players must be at least ${sportRules.minPlayers}`);
      if (sportRules.maxPlayers !== undefined && max > sportRules.maxPlayers) return setMessage(`Players must be at most ${sportRules.maxPlayers}`);
    }
    // final sport to send
    const finalSport = sportKey || getSportKeyFromInput(rawSport) || rawSport;

    const payload = {
      sport: finalSport,
      venueId: selectedVenue._id,
      subVenueId: selectedSubVenue._id,
      timeSlotDocId: timeSlotsDoc?._id ?? selectedSlot.timeSlotDocId,
      slotId: selectedSlot._id ?? selectedSlot.slotId ?? selectedSlot.id,
      description: description || `Pickup ${finalSport} match`,
      playersNeeded: { min, max },
    };

    try {
      setLoading(true);
      const res = await apiHostGame(payload);
      if (res?.success && res.game) {
        navigate(`/games/${res.game._id}`);
      } else {
        setMessage(res?.message || "Failed to host");
      }
    } catch (err: any) {
      setMessage(err?.message || "Hosting failed");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-5">
            <SportPicker value={rawSport} onChange={(v: string) => setRawSport(v)} />

            <div className="group">
              <label className="block text-foreground mb-3 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full group-hover:animate-pulse"></span>
                City *
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g., Mumbai, Delhi, Bangalore"
                className="w-full p-4 rounded-xl bg-card/80 backdrop-blur border-2 border-primary/20 hover:border-primary/40 text-foreground transition-all shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
              />
              {debouncedCity && (
                <div className="text-xs text-primary mt-2 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>Filtering venues in {debouncedCity}...</span>
                </div>
              )}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Trophy className="w-4 h-4 text-primary" />
              Venues in <strong className="text-foreground mx-1">{city || "your city"}</strong> for{" "}
              <strong className="text-foreground mx-1">{sportKey || rawSport || "your sport"}</strong>
            </div>
            {filteredVenues.length > 0 && (
              <div className="text-xs text-muted-foreground mb-2">
                Found {filteredVenues.length} venue{filteredVenues.length !== 1 ? "s" : ""}
              </div>
            )}
            <VenueSearch venues={filteredVenues} loading={loadingVenues} onSelect={setSelectedVenue} selectedId={selectedVenue?._id} sport={sportKey || rawSport} />
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <MapPin className="w-4 h-4 text-primary" />
              Pick the court/field to host your game
            </div>
            <SubVenueList subVenues={subVenues} selectedId={selectedSubVenue?._id} onSelect={setSelectedSubVenue} />
          </div>
        );

      case 3:
        return (
          <div className="space-y-5">
            <div className="group">
              <label className="block text-foreground mb-3 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full group-hover:animate-pulse"></span>
                Select Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().split("T")[0]}
                  max="2030-12-31"
                  onKeyDown={(e) => e.preventDefault()}
                  onChange={(e) => {
                    const selectedDate = e.target.value;
                    const today = new Date().toISOString().split("T")[0];
                    if (selectedDate >= today) {
                      setDate(selectedDate);
                      setMessage(null);
                    } else {
                      e.preventDefault();
                      setMessage("Cannot select past dates");
                    }
                  }}
                  className="w-full p-4 pr-14 rounded-xl bg-card/80 backdrop-blur border-2 border-primary/20 hover:border-primary/40 text-foreground transition-all shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none cursor-pointer"
                  style={{
                    colorScheme: 'dark'
                  }}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg transition-all duration-200 pointer-events-none">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Clock className="w-4 h-4 text-primary" />
              Available time slots for <strong className="text-foreground mx-1">{new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</strong>
            </div>

            <SlotPicker
              timeSlotsDoc={timeSlotsDoc}
              sport={sportKey || rawSport}
              selectedSlotId={selectedSlot?._id || selectedSlot?.id}
              onSelect={(slot: Slot) => setSelectedSlot(slot)}
            />
          </div>
        );

      case 4:
        const slotPrice = getSlotPriceForSport(selectedSlot, sportKey || rawSport);

        return (
          <div className="space-y-5">
            <PlayersForm
              minPlayers={minPlayers}
              maxPlayers={maxPlayers}
              setMin={setMinPlayers}
              setMax={setMaxPlayers}
              description={description}
              setDescription={setDescription}
              sportObj={sportRules}
              slotPrice={slotPrice}
              sport={sportKey || rawSport}
            />

            <div className="bg-gradient-to-br from-primary/10 to-transparent backdrop-blur-md p-5 rounded-xl border-2 border-primary/20">
              <h4 className="font-bold text-lg mb-4 flex items-center gap-2 text-foreground">
                <Check className="w-5 h-5 text-primary" />
                Review Your Game
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      Sport
                    </div>
                    <div className="font-semibold text-foreground">{sportKey || rawSport || "—"}</div>
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Venue
                    </div>
                    <div className="font-semibold text-foreground">{selectedVenue?.name || "—"}</div>
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground">Court/Field</div>
                    <div className="font-semibold text-foreground">{selectedSubVenue?.name || "—"}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Time Slot
                    </div>
                    <div className="font-semibold text-foreground">
                      {selectedSlot ? `${new Date(selectedSlot.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${new Date(selectedSlot.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Players
                    </div>
                    <div className="font-semibold text-foreground">{minPlayers || "—"} - {maxPlayers || "—"}</div>
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground">Description</div>
                    <div className="text-sm text-foreground">{description || "No description"}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-xl">
              <Trophy size={40} className="text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-foreground">Host a Game</h1>
              <p className="text-muted-foreground mt-1">Create and organize your sports match</p>
            </div>
          </div>
        </div>

        {message && (
          <div className={`mb-6 px-4 py-3 rounded-xl border ${message.toLowerCase().includes("success") ? "bg-green-500/20 text-green-200 border-green-500" : "bg-red-500/20 text-red-200 border-red-500"}`}>
            {message}
          </div>
        )}

        <div className="bg-gradient-to-br from-card/80 to-primary/5 rounded-2xl border-2 border-primary/20 p-6">
          <Stepper steps={steps} current={currentStep} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="p-5 rounded-xl border border-primary/10 bg-card/60">
                {renderStep()}
              </div>

              <div className="flex items-center gap-3 mt-6">
                <Button onClick={prev} disabled={currentStep === 0} variant="secondary" className="flex items-center gap-2">
                  <ChevronLeft size={20} />
                  Back
                </Button>

                {currentStep < steps.length - 1 ? (
                  <Button onClick={next} disabled={!canGoNext} className="flex items-center gap-2">
                    Next
                    <ChevronRight size={20} />
                  </Button>
                ) : (
                  <Button onClick={handleHost} disabled={loading} className="bg-primary flex items-center gap-2">
                    <Check size={20} />
                    {loading ? "Creating..." : "Host Game"}
                  </Button>
                )}
              </div>
            </div>

            <aside className="lg:col-span-1">
              <div className="p-5 border-2 border-primary/20 rounded-xl bg-card/80">
                <h3 className="font-bold text-lg mb-4">Game Summary</h3>

                <div className="p-3 border border-primary/20 rounded-lg bg-primary/10">
                  <div className="text-xs text-muted-foreground">Venue</div>
                  <div className="font-semibold">{selectedVenue?.name || "Not selected"}</div>
                  {selectedSubVenue && <div className="text-xs text-muted-foreground mt-1">{selectedSubVenue.name}</div>}
                </div>

                {selectedSlot && (
                  <div className="p-3 border border-primary/20 rounded-lg bg-primary/10 mt-4">
                    <div className="text-xs text-muted-foreground">Time Slot</div>
                    <div className="font-semibold">
                      {new Date(selectedSlot.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {new Date(selectedSlot.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                )}

                {(minPlayers || maxPlayers) && (
                  <div className="p-3 border border-primary/20 rounded-lg bg-primary/10 mt-4">
                    <div className="text-xs text-muted-foreground">Players</div>
                    <div className="font-semibold">{minPlayers || "—"} - {maxPlayers || "—"}</div>
                  </div>
                )}

                {selectedSlot && (
                  <div className="p-3 border border-green-500/30 rounded-lg bg-green-500/10 mt-4">
                    <div className="text-xs text-muted-foreground">Estimated Cost</div>
                    <div className="font-semibold">
                      ₹{getSlotPriceForSport(selectedSlot, sportKey || rawSport) ?? "—"}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostGame;

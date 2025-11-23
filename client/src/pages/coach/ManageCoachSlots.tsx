import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Calendar, Clock, Plus, Trash2, CheckCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  apiGetMyCoachSlots,
  apiCreateCoachSlot,
  apiDeleteCoachSlot,
} from "../../services/api";
import CoachDashboardNav from "../../components/CoachDashboardNav";

interface Slot {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  bookedBy?: string;
}

function ManageCoachSlots() {
  const { user } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [newSlotDate, setNewSlotDate] = useState("");
  const [newSlotStartTime, setNewSlotStartTime] = useState("");
  const [newSlotEndTime, setNewSlotEndTime] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Remove Error Message
  useEffect(() => {
    if (error.length > 0) {
      {
        setTimeout(() => setError(""), 3000);
      }
    }
  }, [error]);

  // Remove Success Message
  useEffect(() => {
    if (success.length > 0) {
      {
        setTimeout(() => setSuccess(""), 3000);
      }
    }
  }, [success]);

  // Fetch slots
  useEffect(() => {
    const loadSlots = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const response = await apiGetMyCoachSlots();
        if (response.success && response.slots) {
          setSlots(response.slots);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadSlots();
  }, [user]);

  // Handle add slot
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newSlotDate || !newSlotStartTime || !newSlotEndTime) {
      setError("Please fill all required fields.");
      return;
    }

    const startTime = new Date(`${newSlotDate}T${newSlotStartTime}`);
    const endTime = new Date(`${newSlotDate}T${newSlotEndTime}`);
    const now = new Date();

    if (startTime <= now) {
      setError("Start time must be in the future.");
      return;
    }
    if (startTime >= endTime) {
      setError(
        "Invalid time for slot. Please check the start and end times(Cross Night slots are not allowed)."
      );
      return;
    }
    if ((endTime.getTime() - startTime.getTime()) / (1000 * 60) < 30) {
      setError("Slot duration must be at least 30 minutes.");
      return;
    }
    if ((endTime.getTime() - startTime.getTime()) / (1000 * 60) > 480) {
      setError("Slot duration cannot exceed 8 hours.");
      return;
    }

    try {
      setLoading(true);
      await apiCreateCoachSlot(newSlotDate, newSlotStartTime, newSlotEndTime);
      const response = await apiGetMyCoachSlots();
      if (response.success && response.slots) {
        setSlots(response.slots);
      }
      setNewSlotDate("");
      setNewSlotStartTime("");
      setNewSlotEndTime("");
      setSuccess("Slot added successfully!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete slot
  const handleDeleteSlot = async (slotId: string) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await apiDeleteCoachSlot(slotId);

      setSuccess("Slot deleted successfully!");
      const response = await apiGetMyCoachSlots();
      if (response.success && response.slots) {
        setSlots(response.slots);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (user?.role !== "coach") {
    const navigate = useNavigate();
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-white/10 p-2">
      <CoachDashboardNav />

      <div className="bg-card p-6 rounded-xl shadow-sm border">
        <div className="space-y-6">
          {/* Add Slot Form */}
          <div className="bg-card/80 backdrop-blur rounded-xl border border-primary/20 p-8">
            <h2 className="text-2xl font-bold mb-6 text-primary">
              Add New Time Slot
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-primary/70" />
                    <input
                      type="date"
                      value={newSlotDate}
                      onChange={(e) => setNewSlotDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full pl-10 px-4 py-3 rounded-md border border-primary/20 bg-background text-foreground focus:outline-none focus:border-primary"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Today or future date only
                  </p>
                </div>

                {/* Start Time */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3.5 w-4 h-4 text-primary/70" />
                    <input
                      type="time"
                      value={newSlotStartTime}
                      onChange={(e) => setNewSlotStartTime(e.target.value)}
                      className="w-full pl-10 px-4 py-3 rounded-md border border-primary/20 bg-background text-foreground focus:outline-none focus:border-primary"
                      required
                    />
                  </div>
                </div>

                {/* End Time */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3.5 w-4 h-4 text-primary/70" />
                    <input
                      type="time"
                      value={newSlotEndTime}
                      onChange={(e) => setNewSlotEndTime(e.target.value)}
                      className="w-full pl-10 px-4 py-3 rounded-md border border-primary/20 bg-background text-foreground focus:outline-none focus:border-primary"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Must be at least 30 minutes long
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="button-style1 w-full md:w-auto border-transparent"
              >
                <Plus className="w-4 h-4 mr-2" />
                {loading ? "Adding..." : "Add Slot"}
              </Button>
            </form>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/20 border-l-4 border-destructive text-foreground p-4 rounded-lg flex items-center space-x-2 mb-4">
              <div className="shrink-0 w-1 h-4 bg-destructive rounded-full" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-500/20 border-l-4 border-green-500 text-foreground p-4 rounded-lg flex items-center space-x-2 mb-4">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <p className="text-sm font-medium">{success}</p>
            </div>
          )}

          {/* Slots List */}
          <div className="bg-card/80 backdrop-blur rounded-xl border border-primary/20 p-8">
            <h2 className="text-2xl font-bold mb-6 text-primary">Your Slots</h2>

            {slots.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-primary/20 rounded-lg">
                <Calendar className="w-12 h-12 mx-auto text-primary/50 mb-4" />
                <p className="text-muted-foreground mb-2">No slots added yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {slots.map((slot) => (
                  <div
                    key={slot._id}
                    className={`relative p-6 rounded-xl border-2 transition-all shadow-sm hover:shadow-md ${
                      slot.isBooked
                        ? "border-green-500/50"
                        : "border-primary/20 hover:border-primary/40 bg-background/50"
                    }`}
                  >
                    {slot.isBooked && (
                      <div className="absolute top-3 right-3 bg-green-500/50 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm mb-2">
                        Booked
                      </div>
                    )}

                    {/* Slot Date */}

                    <div className="mt-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-primary" />
                          <span className="font-semibold">
                            {formatDate(slot.date)}
                          </span>
                        </div>
                      </div>

                      {/* Time */}
                      <div className="flex items-center gap-2 text-muted-foreground mb-4">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">
                          {slot.startTime} - {slot.endTime}
                        </span>
                      </div>
                    </div>
                    {/* Delete Button (only if not booked) */}
                    {!slot.isBooked && (
                      <Button
                        onClick={() => handleDeleteSlot(slot._id)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-600 font-semibold hover:bg-red-500/20 hover:border-red-500/50 transition-all duration-200 py-2.5 shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Slot
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManageCoachSlots;

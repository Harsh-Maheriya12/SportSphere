import React from "react";
import { Clock, Check } from "lucide-react";

interface SlotPickerProps {
  timeSlotsDoc: any | null;
  sport: string;
  selectedSlotId?: string;
  onSelect: (slot: any) => void;
}

const SlotPicker: React.FC<SlotPickerProps> = ({
  timeSlotsDoc,
  sport,
  selectedSlotId,
  onSelect,
}) => {
  // No timeSlot doc → No slots generated
  if (!timeSlotsDoc)
    return (
      <div className="bg-gradient-to-br from-card/80 to-primary/5 backdrop-blur-md rounded-xl border-2 border-dashed border-primary/30 p-6 text-center">
        <Clock className="w-12 h-12 text-primary/50 mx-auto mb-3" />
        <p className="text-foreground font-medium">No slots generated for this date</p>
        <p className="text-sm text-muted-foreground mt-1">
          Select another date or contact venue owner
        </p>
      </div>
    );

  const slots = timeSlotsDoc.slots || [];

  // Filter out past and ongoing slots - only show future slots
  const now = new Date();
  const availableSlots = slots.filter((slot: any) => {
    const slotStartTime = new Date(slot.startTime);
    return slotStartTime > now; // Only show slots that haven't started yet
  });

  if (availableSlots.length === 0)
    return (
      <div className="bg-gradient-to-br from-card/80 to-primary/5 backdrop-blur-md rounded-xl border border-primary/20 p-8 text-center">
        <Clock className="w-10 h-10 text-primary mx-auto mb-3" />
        <p className="text-foreground font-medium">No available slots</p>
        <p className="text-sm text-muted-foreground mt-1">
          All slots for this date have passed or are booked
        </p>
      </div>
    );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {availableSlots.map((slot: any) => {
        const id = slot._id || slot.slotId || slot.id;

        const price =
          slot.prices?.get?.(sport) ??
          slot.prices?.[sport] ??
          null;

        const available = slot.status === "available" && price;

        return (
          <button
            key={id}
            disabled={!available}
            onClick={() => onSelect({ ...slot, id })}
            className={`relative p-3 rounded-xl border-2 text-sm transition-all group ${
              selectedSlotId === id
                ? "border-primary bg-gradient-to-br from-primary/20 to-primary/5 shadow-md"
                : available
                ? "border-primary/20 bg-gradient-to-br from-card/80 to-primary/5 hover:border-primary/40 hover:shadow-md"
                : "border-primary/10 bg-card/40 opacity-50 cursor-not-allowed"
            } backdrop-blur`}
          >
            <div className="flex items-center gap-1 font-medium text-foreground">
              <Clock className="w-3 h-3" />
              {new Date(slot.startTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>

            <div className="text-xs text-muted-foreground mt-1">
              {new Date(slot.endTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>

            {/* Price */}
            {available && (
              <div className="mt-2 text-xs font-semibold text-primary flex items-center gap-1">
                ₹{price}
              </div>
            )}

            {!available && (
              <div className="mt-2 text-xs text-red-400 font-medium">Booked</div>
            )}

            {/* Selected Checkmark */}
            {selectedSlotId === id && (
              <Check className="w-4 h-4 text-primary absolute top-1 right-1" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default SlotPicker;

// src/utils/slotAvailabilityGuard.ts
import TimeSlot from "../models/TimeSlot";
import AppError from "./AppError";
import mongoose from "mongoose";

export const slotAvailabilityCheck = async (timeSlotDocId: string, slotId: string, sport: string) => {
  const ts = await TimeSlot.findById(timeSlotDocId);
  if (!ts) throw new AppError("TimeSlot document not found", 404);

  
  const slot = (ts.slots as mongoose.Types.DocumentArray<any>).id(slotId);
  if (!slot) throw new AppError("Slot not found", 404);

  // Caanot book past slots
  const now = new Date();
  if (new Date(slot.startTime) <= now) {
    throw new AppError("Cannot book a slot in the past", 400);
  }

  // Check slot availability
  if (slot.status !== "available") {
    throw new AppError("This slot is no longer available", 400);
  }

  // Check if price for the selected sport is available
  if (!slot.prices.get(sport)) {
    throw new AppError("Price for selected sport not available in this slot", 400);
  }

  return slot;
};

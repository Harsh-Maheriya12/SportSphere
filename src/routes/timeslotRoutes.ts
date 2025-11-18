import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import {
  generateTimeSlots,
  getSlotsForSubVenueDate,
  updateSlotById,
  deleteSlotsForDate,
} from "../controllers/timeslotController";

const router: ExpressRouter = Router();
//generate time slots for a subvenue + date(24 slots)
router.post("/generate", generateTimeSlots);

//get slots for a subvenue + date
router.get("/subvenue/:subVenueId", getSlotsForSubVenueDate);

//update a specific slot by its ID
router.patch("/slot/:slotId", updateSlotById);

//delete all slots for a subvenue + date
router.delete("/subvenue/:subVenueId", deleteSlotsForDate);

export default router;

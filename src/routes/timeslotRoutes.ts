import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import type { Router as ExpressRouter } from "express";
import {
  generateTimeSlots,
  getSlotsForSubVenueDate,
  updateSlotById,
  deleteSlotsForDate,
} from "../controllers/timeslotController";

const router: ExpressRouter = Router();
//generate time slots for a subvenue + date(24 slots)
router.post("/generate", protect, generateTimeSlots);

//get slots for a subvenue + date
router.get("/subvenue/:subVenueId", getSlotsForSubVenueDate);

//update a specific slot by its ID
router.patch("/slot/:slotId", protect, updateSlotById);

//delete all slots for a subvenue + date
router.delete("/subvenue/:subVenueId", protect, deleteSlotsForDate);

export default router;
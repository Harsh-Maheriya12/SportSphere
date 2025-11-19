import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import type { Router as ExpressRouter } from "express";
import {
  createSubVenue,
  getSubVenuesByVenue,
  updateSubVenue,
  deleteSubVenue,
} from "../controllers/venueController";

const router: ExpressRouter = Router();
// Create a subvenue
router.post("/", protect, createSubVenue);

// Get all subvenues under a venue
router.get("/venue/:venueId", getSubVenuesByVenue);

// Update subvenue
router.patch("/:id", protect, updateSubVenue);

// Delete subvenue
router.delete("/:id", protect, deleteSubVenue);

export default router;

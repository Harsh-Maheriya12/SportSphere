import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import {
  createSubVenue,
  getSubVenuesByVenue,
  updateSubVenue,
  deleteSubVenue,
} from "../controllers/venueController";

const router: ExpressRouter = Router();
// Create a subvenue
router.post("/", createSubVenue);

// Get all subvenues under a venue
router.get("/venue/:venueId", getSubVenuesByVenue);

// Update subvenue
router.patch("/:id", updateSubVenue);

// Delete subvenue
router.delete("/:id", deleteSubVenue);

export default router;

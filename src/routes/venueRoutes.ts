import { Router } from "express";
import { rateVenue, getVenueRatings } from "../controllers/venueController";
import {
  createVenue,
  getVenues,
  getVenueById,
  updateVenue,
  deleteVenue,
} from "../controllers/venueController";
import type { Router as ExpressRouter } from "express";

const router: ExpressRouter = Router();
// Create venue
router.post("/", createVenue);

// Get all venues
router.get("/", getVenues);

// Get venue by ID
router.get("/:id", getVenueById);

// Update venue
router.patch("/:id", updateVenue);

// Delete venue
router.delete("/:id", deleteVenue);

// Add a rating (or update existing)
router.post("/:id/rate", rateVenue);

// Get ratings for a venue
router.get("/:id/ratings", getVenueRatings);

export default router;

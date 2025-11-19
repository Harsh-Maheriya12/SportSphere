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
import { protect } from "../middleware/authMiddleware";
import { aiVenueSearch } from "../controllers/aiVenueSearchController";



const router: ExpressRouter = Router();
// Create venue
router.post("/", protect,createVenue);

// Get all venues
router.get("/", getVenues);

// Get venue by ID
router.get("/:id", getVenueById);

// Update venue
router.patch("/:id",protect, updateVenue);

// Delete venue
router.delete("/:id",protect, deleteVenue);

// Add a rating (or update existing)
router.post("/:id/rate",protect, rateVenue);

// Get ratings for a venue
router.get("/:id/ratings", getVenueRatings);

// Search Venues
router.post("/search", aiVenueSearch);

export default router;

import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { protect } from "../middleware/authMiddleware";
import { upload } from "../middleware/multer";

import {
  createSubVenue,
  getSubVenuesByVenue,
  updateSubVenue,
  deleteSubVenue,
} from "../controllers/venueController";

const router: ExpressRouter = Router();

// Create SubVenue with images
router.post("/venue/:venueId", protect, upload, createSubVenue);

// Get all subvenues under a venue
router.get("/venue/:venueId", getSubVenuesByVenue);

// Update subvenue (no image for now, can add later if needed)
router.patch("/:id", protect, updateSubVenue);

//  Delete subvenue
router.delete("/:id", protect, deleteSubVenue);

export default router;

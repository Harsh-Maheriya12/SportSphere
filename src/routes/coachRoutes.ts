import express from "express";
import asyncHandler from "express-async-handler";
import { protect } from "../middleware/authMiddleware";
import {
  getAllCoaches,
  getCoachProfile,
  createOrUpdateCoachDetail,
  getMyCoachDetails,
  deleteCoachPhoto,
  getCoachSlots,
  createCoachSlot,
  getMySlots,
  deleteCoachSlot,
  requestCoachBooking,
  getCoachBookingRequests,
  acceptBookingRequest,
  rejectBookingRequest,
  getMyCoachBookings,
} from "../controllers/coachController";
import { upload } from "../middleware/multer";

const router = express.Router();

// Public routes
router.get("/get-all-coaches", asyncHandler(getAllCoaches));
router.get("/get-coach-profile/:id", asyncHandler(getCoachProfile));
router.get("/get-coach-slots/:id", asyncHandler(getCoachSlots));

// Coach profile management
router.post("/create-or-update-details", protect, upload, asyncHandler(createOrUpdateCoachDetail));
router.get("/get-my-details", protect, asyncHandler(getMyCoachDetails));
router.delete("/delete-photo", protect, asyncHandler(deleteCoachPhoto));

// Coach slot management
router.post("/create-slot", protect, asyncHandler(createCoachSlot));
router.get("/get-my-slots", protect, asyncHandler(getMySlots));
router.delete("/delete-slot/:id", protect, asyncHandler(deleteCoachSlot));

// Coach booking management (coach side)
router.get(  "/get-booking-requests",  protect,  asyncHandler(getCoachBookingRequests));
router.put("/accept-booking/:id", protect, asyncHandler(acceptBookingRequest));
router.put("/reject-booking/:id", protect, asyncHandler(rejectBookingRequest));

// Player booking management
router.post("/request-booking", protect, asyncHandler(requestCoachBooking));
router.get("/get-my-bookings", protect, asyncHandler(getMyCoachBookings));

export default router;

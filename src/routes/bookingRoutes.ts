import express from "express";
import { protect } from "../middleware/authMiddleware";

// Direct booking
import { createDirectBooking } from "../controllers/Booking/directBooking";

// Game-based booking
import { startGameBooking } from "../controllers/Booking/gameBooking";

// Get my venue bookings
import { getMyVenueBookings } from "../controllers/Booking/getMyVenueBooking";

// Verify payment
import { verifyPayment } from "../controllers/Booking/verifyPayment";

// Stripe webhook
import { stripeWebhook } from "../controllers/payment/stripeWebhook";

const router: express.Router = express.Router();

router.get(
  "/my-bookings",
  protect,
  getMyVenueBookings
);

router.get(
  "/verify-payment",
  protect,
  verifyPayment
);

router.post(
  "/direct",
  protect,
  createDirectBooking
);

router.post(
  "/game/:gameId",
  protect,
  startGameBooking
);

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

export default router;
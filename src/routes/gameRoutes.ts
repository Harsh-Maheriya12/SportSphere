// src/routes/gameRoutes.ts
import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import { authorizeRoles } from "../middleware/gameMiddleware";
import type { Router as ExpressRouter } from "express";

import { 
  hostGame,
  cancelGame,
  leaveGame
} from "../controllers/gameControllers/hostGame";

import { 
  getGameById, 
  getMyBookings, 
  getGames 
} from "../controllers/gameControllers/getGames";

import { 
    rateVenueAfterGame,
    completeGame
  } from "../controllers/gameControllers/postGame";

const router:ExpressRouter = Router();

// Protected Routes
// Host a game (only verified user, not venue owner)
router.post(
  "/host",
  protect,
  authorizeRoles("player"),
  hostGame
);

// Cancel hosted game
router.patch(
  "/:gameId/cancel",
  protect,
  authorizeRoles("player"),
  cancelGame
);

// Leave game (after approval)
router.delete(
  "/:gameId/leave",
  protect,
  authorizeRoles( "player"),
  leaveGame
);

// Public Routes
// Get all games with optional filters (sport, venue, date, price, location)
router.get("/", getGames);

// Get single game details
router.get("/:gameId", getGameById);

// Get all bookings related to logged-in user
router.get("/my-bookings", protect, getMyBookings);

// Complete a game (host only, after end time)
router.patch(
  "/:id/complete",
  protect,
  authorizeRoles("player"),
  completeGame
);

// Rate venue after game completion
router.post(
  "/:gameId/rate",
  protect,
  authorizeRoles("player"),
  rateVenueAfterGame
);

export default router;
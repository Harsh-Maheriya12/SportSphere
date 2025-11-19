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

import { getGameById } from "../controllers/gameControllers/getGames";

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
// Get single game details
router.get("/:gameId", getGameById);

export default router;
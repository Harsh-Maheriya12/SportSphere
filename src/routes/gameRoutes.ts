import express from 'express';
import {
  createGame,
  getGames,
  joinGame,
  approveRequest,
  rejectRequest,
} from '../controllers/gameControllers';
import { protect } from '../middleware/authMiddleware';
import { authorizeRoles, checkTimeSlotConflict, validateGameInput } from '../middleware/gameMiddleware';


const router = express.Router();

// Fetch all open games
router.get('/', protect, getGames);

// Create a new game (only for authorized users)
router.post(
  '/',
  protect,
  validateGameInput, 
  authorizeRoles('user'),
  checkTimeSlotConflict,
  createGame
);

// Join a game (only for authorized users)
router.post('/:id/join', protect, authorizeRoles('user'), joinGame);

// Approve or reject join requests (only for authorized users who are hosts)
router.post('/:id/approve/:userId', protect, approveRequest);
router.post('/:id/reject/:userId', protect, rejectRequest);

export default router;
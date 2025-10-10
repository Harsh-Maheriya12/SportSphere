import { Router } from 'express';
import { getUserProfile } from '../controllers/userController';
import { protect } from '../middleware/authMiddleware'; // IMPORT THE PROTECT MIDDLEWARE

const router = Router();

// APPLY THE 'protect' MIDDLEWARE TO THIS ROUTE.
// Any request to this endpoint must include a valid JWT in the Authorization header.
router.route('/profile').get(protect, getUserProfile);

export default router;
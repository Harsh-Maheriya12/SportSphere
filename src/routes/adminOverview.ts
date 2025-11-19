import express from 'express';
import { getOverviewStats } from '../controllers/adminManagementController';
import { protectAdmin } from '../middleware/authMiddleware';

const router = express.Router();
router.use(protectAdmin);

router.get('/stats', getOverviewStats);

export default router;


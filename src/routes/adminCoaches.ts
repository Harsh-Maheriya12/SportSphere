import express from 'express';
import { listCoaches, deleteCoach } from '../controllers/adminManagementController';
import { protectAdmin } from '../middleware/authMiddleware';

const router = express.Router();
router.use(protectAdmin);

router.get('/', listCoaches);
router.delete('/:id', deleteCoach);

export default router;

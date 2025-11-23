import express from 'express';
import { listUsers, getUserById, deleteUser } from '../controllers/adminManagementController';
import { protectAdmin } from '../middleware/authMiddleware';

const router = express.Router();
router.use(protectAdmin);

router.get('/', listUsers);
router.get('/:id', getUserById);
router.delete('/:id', deleteUser);

export default router;

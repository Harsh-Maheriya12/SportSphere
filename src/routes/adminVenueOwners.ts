import express from 'express';
import { listVenueOwners, deleteVenueOwner } from '../controllers/adminManagementController';
import { protectAdmin } from '../middleware/authMiddleware';

const router = express.Router();
router.use(protectAdmin);

router.get('/', listVenueOwners);
router.delete('/:id', deleteVenueOwner);

export default router;

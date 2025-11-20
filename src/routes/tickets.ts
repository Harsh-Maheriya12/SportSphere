import express from 'express';
import { createTicket, getMyTickets, getTicketById } from '../controllers/ticketController';
import { upload } from '../middleware/multer';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Public: create a support ticket (accepts optional multiple files)
router.post('/', upload, createTicket);

// Authenticated user: list my tickets
router.get('/mine', protect, getMyTickets);

// Authenticated user: get a single ticket by Mongo _id (only if owner)
router.get('/:id', protect, getTicketById);

export default router;

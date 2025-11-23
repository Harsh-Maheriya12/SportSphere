import express from 'express';
import { getAllTickets, replyToTicket, closeTicket } from '../controllers/ticketController';
import { protectAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// Protect all admin ticket routes
router.use(protectAdmin);

router.get('/', getAllTickets);
router.post('/:id/reply', replyToTicket);
router.patch('/:id/close', closeTicket);

export default router;

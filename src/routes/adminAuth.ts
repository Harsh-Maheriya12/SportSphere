import { Router } from 'express';
import { loginAdmin } from '../controllers/adminAuthController';

const router = Router();

router.post('/loginAdmin', loginAdmin);

export default router;
import { Router } from 'express';
import { loginAdmin, registerAdmin } from '../controllers/adminAuthController';

const router = Router();

router.post('/loginAdmin', loginAdmin);
router.post('/registerAdmin', registerAdmin);

export default router;

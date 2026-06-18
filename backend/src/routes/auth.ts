import { Router } from 'express';
import { login, logout, me } from '../controllers/authController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authenticate, me);

export default router;

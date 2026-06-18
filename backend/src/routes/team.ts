import { Router } from 'express';
import { listTeam, createMember, updateMember, resetPassword, deleteMember } from '../controllers/teamController';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();

router.use(authenticate);
router.get('/', listTeam);
router.post('/', requireAdmin, createMember);
router.patch('/:id', updateMember);
router.post('/:id/reset-password', resetPassword);
router.delete('/:id', requireAdmin, deleteMember);

export default router;

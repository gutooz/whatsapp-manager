import { Router } from 'express';
import { listContacts, getContact, updateContact } from '../controllers/contactController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);
router.get('/', listContacts);
router.get('/:id', getContact);
router.patch('/:id', updateContact);

export default router;

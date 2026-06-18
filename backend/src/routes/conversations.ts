import { Router } from 'express';
import {
  listConversations,
  getConversation,
  updateConversation,
  assignConversationRoute,
  sendMessage,
  getMessages,
  addNote,
} from '../controllers/conversationController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', listConversations);
router.get('/:id', getConversation);
router.patch('/:id', updateConversation);
router.post('/:id/assign', assignConversationRoute);
router.post('/:id/messages', sendMessage);
router.get('/:id/messages', getMessages);
router.post('/:id/notes', addNote);

export default router;

import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  testConnection,
  getConnectionState,
  getQRCode,
  logoutWhatsApp,
} from '../controllers/settingsController';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/', getSettings);
router.patch('/', updateSettings);
router.post('/test-connection', testConnection);
router.get('/connection-state', getConnectionState);
router.get('/qrcode', getQRCode);
router.post('/logout', logoutWhatsApp);

export default router;

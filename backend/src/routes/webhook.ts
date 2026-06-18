import { Router, Request, Response, NextFunction } from 'express';
import { handleEvolutionEvent } from '../services/webhookService';
import { logger } from '../lib/logger';

const router = Router();

function validateWebhookSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = req.headers['x-webhook-secret'];
  const expected = process.env.WEBHOOK_SECRET;

  if (expected && secret !== expected) {
    logger.warn('Webhook request with invalid secret', { ip: req.ip });
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}

router.post('/evolution', validateWebhookSecret, async (req, res, next) => {
  try {
    await handleEvolutionEvent(req.body);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;

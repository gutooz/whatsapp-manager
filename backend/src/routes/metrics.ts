import { Router } from 'express';
import { getOverviewMetrics, getAgentMetricsRoute, getTimelineRoute } from '../controllers/metricsController';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/overview', getOverviewMetrics);
router.get('/agents', getAgentMetricsRoute);
router.get('/timeline', getTimelineRoute);

export default router;

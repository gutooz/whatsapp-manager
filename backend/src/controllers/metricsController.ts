import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getOverview, getAgentMetrics, getTimeline } from '../services/metricsService';

const querySchema = z.object({
  period: z.enum(['today', '7d', '30d', 'custom']).default('today'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  userId: z.string().uuid().optional(),
});

function resolveDateRange(query: z.infer<typeof querySchema>): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  if (query.period === 'today') {
    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
    return { startDate, endDate };
  }

  if (query.period === '7d') {
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);
    return { startDate, endDate };
  }

  if (query.period === '30d') {
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);
    return { startDate, endDate };
  }

  if (query.period === 'custom' && query.startDate && query.endDate) {
    return {
      startDate: new Date(query.startDate),
      endDate: new Date(query.endDate),
    };
  }

  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);
  return { startDate, endDate };
}

export async function getOverviewMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = querySchema.parse(req.query);
    const { startDate, endDate } = resolveDateRange(query);
    const data = await getOverview(startDate, endDate);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getAgentMetricsRoute(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = querySchema.parse(req.query);
    const { startDate, endDate } = resolveDateRange(query);
    const data = await getAgentMetrics(startDate, endDate);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getTimelineRoute(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = querySchema.parse(req.query);
    const { startDate, endDate } = resolveDateRange(query);
    const data = await getTimeline(query.userId ?? null, startDate, endDate);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

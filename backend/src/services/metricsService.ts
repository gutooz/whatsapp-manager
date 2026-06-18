import { prisma } from '../lib/prisma';
import { isOnline } from '../socket';

export async function getOverview(startDate: Date, endDate: Date) {
  const [openCount, messagesCount, resolvedCount] = await Promise.all([
    prisma.conversation.count({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.message.count({
      where: {
        direction: 'OUTBOUND',
        timestamp: { gte: startDate, lte: endDate },
      },
    }),
    prisma.conversation.count({
      where: {
        status: 'RESOLVED',
        updatedAt: { gte: startDate, lte: endDate },
      },
    }),
  ]);

  const totalConvInPeriod = await prisma.conversation.count({
    where: { createdAt: { gte: startDate, lte: endDate } },
  });

  const resolvedRate =
    totalConvInPeriod > 0 ? Math.round((resolvedCount / totalConvInPeriod) * 100) : 0;

  const avgResponseTime = await getAvgResponseTime(startDate, endDate);

  return {
    openConversations: openCount,
    messagesToday: messagesCount,
    resolvedRate,
    avgFirstResponseMs: avgResponseTime,
  };
}

async function getAvgResponseTime(startDate: Date, endDate: Date): Promise<number> {
  const metrics = await prisma.dailyMetric.aggregate({
    _avg: { avgResponseTimeMs: true },
    where: {
      date: { gte: startDate, lte: endDate },
      avgResponseTimeMs: { gt: 0 },
    },
  });

  return Math.round(metrics._avg.avgResponseTimeMs ?? 0);
}

export async function getAgentMetrics(startDate: Date, endDate: Date) {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      color: true,
      role: true,
      updatedAt: true,
      metrics: {
        where: { date: { gte: startDate, lte: endDate } },
        select: {
          conversationsHandled: true,
          messagesSent: true,
          avgResponseTimeMs: true,
          resolvedCount: true,
        },
      },
      conversations: {
        where: {
          conversation: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
        },
        select: { conversationId: true },
      },
    },
  });

  return Promise.all(
    users.map(async (user) => {
      const online = await isOnline(user.id);
      const totals = user.metrics.reduce(
        (acc, m) => ({
          conversationsHandled: acc.conversationsHandled + m.conversationsHandled,
          messagesSent: acc.messagesSent + m.messagesSent,
          avgResponseTimeMs:
            acc.avgResponseTimeMs === 0
              ? m.avgResponseTimeMs
              : Math.round((acc.avgResponseTimeMs + m.avgResponseTimeMs) / 2),
          resolvedCount: acc.resolvedCount + m.resolvedCount,
        }),
        { conversationsHandled: 0, messagesSent: 0, avgResponseTimeMs: 0, resolvedCount: 0 },
      );

      return {
        id: user.id,
        name: user.name,
        color: user.color,
        role: user.role,
        online,
        activeConversations: user.conversations.length,
        ...totals,
      };
    }),
  );
}

export async function getTimeline(userId: string | null, startDate: Date, endDate: Date) {
  const where = userId
    ? { sentById: userId, timestamp: { gte: startDate, lte: endDate } }
    : { timestamp: { gte: startDate, lte: endDate } };

  const messages = await prisma.message.findMany({
    where: { ...where, direction: 'OUTBOUND' },
    select: { timestamp: true },
  });

  const hourCounts: Record<number, number> = {};
  for (let h = 0; h < 24; h++) hourCounts[h] = 0;

  messages.forEach((m) => {
    const hour = new Date(m.timestamp).getHours();
    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;
  });

  return Object.entries(hourCounts).map(([hour, count]) => ({
    hour: Number(hour),
    count,
  }));
}

export async function updateDailyMetric(userId: string, field: keyof {
  conversationsHandled: number;
  messagesSent: number;
  resolvedCount: number;
}): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.dailyMetric.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today, [field]: 1 },
    update: { [field]: { increment: 1 } },
  });
}

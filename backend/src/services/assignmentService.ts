import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { emitToAll } from '../socket';
import { logger } from '../lib/logger';

const ROUND_ROBIN_KEY = 'assignment:round_robin_index';

export async function autoAssign(conversationId: string): Promise<string | null> {
  const settings = await prisma.settings.findFirst();
  if (!settings?.autoAssign) return null;

  const mode = settings.assignmentMode;

  const activeMembers = await prisma.user.findMany({
    where: { isActive: true, role: 'MEMBER' },
    select: { id: true },
  });

  if (activeMembers.length === 0) return null;

  let selectedUserId: string | null = null;

  if (mode === 'ROUND_ROBIN') {
    selectedUserId = await roundRobinSelect(activeMembers.map((m) => m.id));
  } else if (mode === 'LEAST_BUSY') {
    selectedUserId = await leastBusySelect(activeMembers.map((m) => m.id));
  }

  if (!selectedUserId) return null;

  await assignConversation(conversationId, selectedUserId, 'auto');
  return selectedUserId;
}

async function roundRobinSelect(memberIds: string[]): Promise<string> {
  const indexStr = await redis.get(ROUND_ROBIN_KEY);
  let index = indexStr ? parseInt(indexStr, 10) : 0;
  const selected = memberIds[index % memberIds.length];
  await redis.set(ROUND_ROBIN_KEY, (index + 1) % memberIds.length);
  return selected;
}

async function leastBusySelect(memberIds: string[]): Promise<string> {
  const counts = await Promise.all(
    memberIds.map(async (id) => ({
      id,
      count: await prisma.conversationAssignment.count({
        where: {
          userId: id,
          conversation: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
        },
      }),
    })),
  );

  counts.sort((a, b) => a.count - b.count);
  return counts[0].id;
}

export async function assignConversation(
  conversationId: string,
  userId: string,
  assignedBy: string,
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const assignedByUser =
    assignedBy === 'auto'
      ? null
      : await prisma.user.findUnique({ where: { id: assignedBy } });

  await prisma.$transaction(async (tx) => {
    await tx.conversationAssignment.upsert({
      where: { conversationId },
      create: { conversationId, userId, assignedBy },
      update: { userId, assignedBy, assignedAt: new Date() },
    });

    await tx.assignmentHistory.create({
      data: {
        conversationId,
        userId,
        userName: user.name,
        assignedBy,
        assignedByName: assignedByUser?.name ?? 'Sistema',
        assignedAt: new Date(),
      },
    });

    await tx.conversation.update({
      where: { id: conversationId },
      data: { status: 'IN_PROGRESS' },
    });
  });

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { contact: true, assignment: { include: { user: true } } },
  });

  emitToAll('conversation_updated', conversation);
  logger.info(`Conversation ${conversationId} assigned to ${userId}`);
}

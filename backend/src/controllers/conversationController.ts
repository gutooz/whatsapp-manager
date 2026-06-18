import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { assignConversation } from '../services/assignmentService';
import { evolutionService } from '../services/evolutionService';
import { updateDailyMetric } from '../services/metricsService';
import { emitToConversation, emitToAll } from '../socket';

const listSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'WAITING']).optional(),
  userId: z.string().uuid().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(30),
  search: z.string().optional(),
});

const updateSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'WAITING']).optional(),
  tags: z.array(z.string()).optional(),
});

const assignSchema = z.object({
  userId: z.string().uuid(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(4096),
  type: z.enum(['TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT']).default('TEXT'),
  mediaUrl: z.string().url().optional(),
});

export async function listConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = listSchema.parse(req.query);
    const isAdmin = req.user?.role === 'ADMIN';

    const where: Record<string, unknown> = {};

    if (query.status) where.status = query.status;

    if (!isAdmin) {
      where.assignment = { userId: req.user!.userId };
    } else if (query.userId) {
      where.assignment = { userId: query.userId };
    }

    if (query.search) {
      where.contact = {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { phone: { contains: query.search } },
        ],
      };
    }

    if (query.cursor) {
      where.id = { lt: query.cursor };
    }

    const conversations = await prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      take: query.limit + 1,
      include: {
        contact: { select: { id: true, name: true, phone: true, profilePic: true } },
        assignment: {
          include: { user: { select: { id: true, name: true, color: true } } },
        },
      },
    });

    const hasMore = conversations.length > query.limit;
    const items = hasMore ? conversations.slice(0, -1) : conversations;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    res.json({ items, nextCursor, hasMore });
  } catch (err) {
    next(err);
  }
}

export async function getConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const conversation = await prisma.conversation.findUniqueOrThrow({
      where: { id },
      include: {
        contact: true,
        assignment: { include: { user: { select: { id: true, name: true, color: true } } } },
        assignmentHistory: { orderBy: { assignedAt: 'desc' } },
        notes: {
          include: { user: { select: { id: true, name: true, color: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    await prisma.conversation.update({
      where: { id },
      data: { unreadCount: 0 },
    });

    res.json(conversation);
  } catch (err) {
    next(err);
  }
}

export async function updateConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const data = updateSchema.parse(req.body);

    const previous = await prisma.conversation.findUniqueOrThrow({ where: { id } });

    const conversation = await prisma.conversation.update({
      where: { id },
      data,
      include: {
        contact: true,
        assignment: { include: { user: { select: { id: true, name: true, color: true } } } },
      },
    });

    if (data.status === 'RESOLVED' && previous.status !== 'RESOLVED') {
      const assignment = await prisma.conversationAssignment.findUnique({
        where: { conversationId: id },
      });
      if (assignment) {
        await updateDailyMetric(assignment.userId, 'resolvedCount');
      }
    }

    emitToAll('conversation_updated', conversation);
    res.json(conversation);
  } catch (err) {
    next(err);
  }
}

export async function assignConversationRoute(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { userId } = assignSchema.parse(req.body);

    await assignConversation(id, userId, req.user!.userId);

    const conversation = await prisma.conversation.findUniqueOrThrow({
      where: { id },
      include: {
        contact: true,
        assignment: { include: { user: { select: { id: true, name: true, color: true } } } },
      },
    });

    res.json(conversation);
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { content, type, mediaUrl } = sendMessageSchema.parse(req.body);

    const conversation = await prisma.conversation.findUniqueOrThrow({
      where: { id },
      include: {
        contact: true,
        assignment: true,
      },
    });

    const settings = await prisma.settings.findFirst();
    const isAssigned = conversation.assignment?.userId === req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isAssigned && !isAdmin && !settings?.allowMembersOverride) {
      throw new AppError(403, 'You are not assigned to this conversation', 'NOT_ASSIGNED');
    }

    let evolutionId: string | null = null;
    if (type === 'TEXT') {
      evolutionId = await evolutionService.sendText(conversation.contact.phone, content);
    } else if (mediaUrl) {
      evolutionId = await evolutionService.sendMedia(
        conversation.contact.phone,
        mediaUrl,
        content,
        type.toLowerCase() as 'image' | 'video' | 'document' | 'audio',
      );
    }

    const message = await prisma.message.create({
      data: {
        conversationId: id,
        evolutionId,
        content,
        type,
        direction: 'OUTBOUND',
        sentById: req.user!.userId,
        mediaUrl,
        status: evolutionId ? 'SENT' : 'FAILED',
        timestamp: new Date(),
      },
      include: {
        sentBy: { select: { id: true, name: true, color: true } },
      },
    });

    await prisma.conversation.update({
      where: { id },
      data: { lastMessage: content, lastMessageAt: new Date() },
    });

    await updateDailyMetric(req.user!.userId, 'messagesSent');

    emitToConversation(id, 'new_message', message);
    emitToAll('conversation_updated', {
      id,
      lastMessage: content,
      lastMessageAt: new Date(),
    });

    res.json(message);
  } catch (err) {
    next(err);
  }
}

export async function getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { cursor, limit = '30' } = req.query as Record<string, string>;

    const messages = await prisma.message.findMany({
      where: {
        conversationId: id,
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: Number(limit) + 1,
      include: {
        sentBy: { select: { id: true, name: true, color: true } },
      },
    });

    const hasMore = messages.length > Number(limit);
    const items = hasMore ? messages.slice(0, -1) : messages;

    res.json({
      items: items.reverse(),
      nextCursor: hasMore ? items[0]?.id : null,
      hasMore,
    });
  } catch (err) {
    next(err);
  }
}

export async function addNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { content } = z.object({ content: z.string().min(1) }).parse(req.body);

    const note = await prisma.conversationNote.create({
      data: { conversationId: id, userId: req.user!.userId, content },
      include: { user: { select: { id: true, name: true, color: true } } },
    });

    emitToConversation(id, 'note_added', note);
    res.json(note);
  } catch (err) {
    next(err);
  }
}

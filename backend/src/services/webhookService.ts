import { prisma } from '../lib/prisma';
import { emitToConversation, emitToAll } from '../socket';
import { autoAssign } from './assignmentService';
import { updateDailyMetric } from './metricsService';
import { evolutionService } from './evolutionService';
import { logger } from '../lib/logger';

type EvolutionEvent = {
  event: string;
  instance: string;
  data: Record<string, unknown>;
};

export async function handleEvolutionEvent(payload: EvolutionEvent): Promise<void> {
  try {
    switch (payload.event) {
      case 'messages.upsert':
        await handleMessagesUpsert(payload.data);
        break;
      case 'messages.update':
        await handleMessagesUpdate(payload.data);
        break;
      case 'contacts.update':
        await handleContactsUpdate(payload.data);
        break;
      case 'presence.update':
        await handlePresenceUpdate(payload.data);
        break;
      default:
        logger.debug(`Unhandled Evolution event: ${payload.event}`);
    }
  } catch (err) {
    logger.error('Webhook handler error', { event: payload.event, err });
    throw err;
  }
}

async function handleMessagesUpsert(data: Record<string, unknown>): Promise<void> {
  const messages = Array.isArray(data) ? data : [data];

  for (const msg of messages) {
    const key = msg.key as Record<string, unknown>;
    const messageId = key?.id as string;
    const fromMe = key?.fromMe as boolean;
    const remoteJid = key?.remoteJid as string;

    if (!remoteJid || remoteJid.includes('@g.us')) continue; // Skip group messages

    const phone = remoteJid.replace('@s.whatsapp.net', '');
    const messageContent = msg.message as Record<string, unknown>;
    const pushName = msg.pushName as string | undefined;
    const timestamp = new Date((msg.messageTimestamp as number) * 1000);

    const { type, content, mediaUrl } = extractMessageContent(messageContent);

    let contact = await prisma.contact.findUnique({ where: { phone } });
    if (!contact) {
      const profilePic = await evolutionService.getProfilePicture(phone);
      contact = await prisma.contact.create({
        data: { phone, name: pushName ?? phone, profilePic },
      });
    } else if (pushName && !contact.name) {
      await prisma.contact.update({ where: { phone }, data: { name: pushName } });
    }

    let conversation = await prisma.conversation.findFirst({
      where: { contactId: contact.id, status: { not: 'RESOLVED' } },
      include: { assignment: true },
    });

    const isNew = !conversation;

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          contactId: contact.id,
          status: 'OPEN',
          lastMessage: content,
          lastMessageAt: timestamp,
        },
        include: { assignment: true },
      });
    }

    const existing = messageId
      ? await prisma.message.findUnique({ where: { evolutionId: messageId } })
      : null;
    if (existing) continue;

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        evolutionId: messageId,
        content,
        type,
        direction: fromMe ? 'OUTBOUND' : 'INBOUND',
        mediaUrl: mediaUrl ?? null,
        status: fromMe ? 'DELIVERED' : 'SENT',
        timestamp,
        sentById: null,
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: content,
        lastMessageAt: timestamp,
        unreadCount: fromMe ? 0 : { increment: 1 },
      },
    });

    emitToConversation(conversation.id, 'new_message', {
      ...message,
      conversationId: conversation.id,
    });

    emitToAll('conversation_updated', {
      id: conversation.id,
      lastMessage: content,
      lastMessageAt: timestamp,
    });

    if (!fromMe && isNew) {
      await autoAssign(conversation.id);
      if (conversation.assignment?.userId) {
        await updateDailyMetric(conversation.assignment.userId, 'conversationsHandled');
      }
    }
  }
}

async function handleMessagesUpdate(data: Record<string, unknown>): Promise<void> {
  const updates = Array.isArray(data) ? data : [data];

  for (const update of updates) {
    const key = update.key as Record<string, unknown>;
    const messageId = key?.id as string;
    const status = mapStatus(update.update as Record<string, unknown>);

    if (!messageId || !status) continue;

    await prisma.message.updateMany({
      where: { evolutionId: messageId },
      data: { status },
    });

    const message = await prisma.message.findUnique({ where: { evolutionId: messageId } });
    if (message) {
      emitToConversation(message.conversationId, 'message_status_updated', {
        messageId: message.id,
        evolutionId: messageId,
        status,
      });
    }
  }
}

async function handleContactsUpdate(data: Record<string, unknown>): Promise<void> {
  const contacts = Array.isArray(data) ? data : [data];

  for (const c of contacts) {
    const phone = (c.id as string)?.replace('@s.whatsapp.net', '');
    if (!phone) continue;

    await prisma.contact.updateMany({
      where: { phone },
      data: {
        name: (c.pushName as string) ?? undefined,
        profilePic: (c.profilePictureUrl as string) ?? undefined,
      },
    });
  }
}

async function handlePresenceUpdate(data: Record<string, unknown>): Promise<void> {
  const id = data.id as string;
  if (!id) return;

  const phone = id.replace('@s.whatsapp.net', '');
  const presences = data.presences as Record<string, { lastKnownPresence: string }>;
  const presence = presences?.[id]?.lastKnownPresence;

  const conversation = await prisma.conversation.findFirst({
    where: { contact: { phone } },
    select: { id: true },
  });

  if (conversation) {
    emitToConversation(conversation.id, 'typing_indicator', {
      conversationId: conversation.id,
      typing: presence === 'composing',
    });
  }
}

function extractMessageContent(message: Record<string, unknown>): {
  type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'STICKER';
  content: string;
  mediaUrl?: string;
} {
  if (!message) return { type: 'TEXT', content: '[mensagem vazia]' };

  if (message.conversation) return { type: 'TEXT', content: message.conversation as string };
  if (message.extendedTextMessage) {
    const ext = message.extendedTextMessage as Record<string, unknown>;
    return { type: 'TEXT', content: ext.text as string };
  }
  if (message.imageMessage) {
    const img = message.imageMessage as Record<string, unknown>;
    return {
      type: 'IMAGE',
      content: (img.caption as string) ?? '[imagem]',
      mediaUrl: img.url as string,
    };
  }
  if (message.audioMessage) {
    return { type: 'AUDIO', content: '[áudio]', mediaUrl: (message.audioMessage as Record<string, unknown>).url as string };
  }
  if (message.videoMessage) {
    const vid = message.videoMessage as Record<string, unknown>;
    return { type: 'VIDEO', content: (vid.caption as string) ?? '[vídeo]', mediaUrl: vid.url as string };
  }
  if (message.documentMessage) {
    const doc = message.documentMessage as Record<string, unknown>;
    return { type: 'DOCUMENT', content: (doc.fileName as string) ?? '[documento]', mediaUrl: doc.url as string };
  }
  if (message.stickerMessage) {
    return { type: 'STICKER', content: '[sticker]', mediaUrl: (message.stickerMessage as Record<string, unknown>).url as string };
  }

  return { type: 'TEXT', content: '[mensagem não suportada]' };
}

function mapStatus(update: Record<string, unknown>): 'DELIVERED' | 'READ' | null {
  const status = update?.status;
  if (status === 'DELIVERY_ACK' || status === 3) return 'DELIVERED';
  if (status === 'READ' || status === 4) return 'READ';
  return null;
}

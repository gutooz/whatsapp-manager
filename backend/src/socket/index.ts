import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { AuthPayload } from '../middlewares/auth';
import { logger } from '../lib/logger';
import { redis } from '../lib/redis';

let io: Server;

const ONLINE_KEY = (userId: string) => `member:online:${userId}`;
const ONLINE_TTL = 600; // 10 minutes

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ??
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) return next(new Error('Unauthorized'));

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
      (socket as AuthSocket).user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthSocket;
    const userId = authSocket.user?.userId;

    if (!userId) {
      socket.disconnect();
      return;
    }

    logger.info(`Socket connected: ${userId}`);
    socket.join(`user:${userId}`);
    markOnline(userId);

    socket.on('join_conversation', (conversationId: string) => {
      socket.join(`conv:${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conv:${conversationId}`);
    });

    socket.on('member_heartbeat', () => {
      markOnline(userId);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${userId}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

async function markOnline(userId: string): Promise<void> {
  await redis.setex(ONLINE_KEY(userId), ONLINE_TTL, '1');
  getIO().emit('member_status_update', { userId, online: true });
}

export async function isOnline(userId: string): Promise<boolean> {
  const val = await redis.get(ONLINE_KEY(userId));
  return val === '1';
}

export function emitToConversation(conversationId: string, event: string, data: unknown): void {
  getIO().to(`conv:${conversationId}`).emit(event, data);
}

export function emitToAll(event: string, data: unknown): void {
  getIO().emit(event, data);
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  getIO().to(`user:${userId}`).emit(event, data);
}

interface AuthSocket extends Socket {
  user?: AuthPayload;
}

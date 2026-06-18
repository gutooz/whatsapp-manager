import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { prisma } from '../lib/prisma';

export interface AuthPayload {
  userId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token =
    req.cookies?.token ??
    req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    throw new AppError(401, 'Not authenticated', 'UNAUTHENTICATED');
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    throw new AppError(401, 'Invalid or expired token', 'INVALID_TOKEN');
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) throw new AppError(401, 'Not authenticated', 'UNAUTHENTICATED');
  if (req.user.role !== 'ADMIN') throw new AppError(403, 'Admin access required', 'FORBIDDEN');
  next();
}

export async function updateMemberActivity(userId: string): Promise<void> {
  await prisma.user.updateMany({
    where: { id: userId },
    data: { updatedAt: new Date() },
  });
}

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';

const createSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#25D366'),
});

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'MEMBER']).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  isActive: z.boolean().optional(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8),
});

export async function listTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        color: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            conversations: {
              where: { conversation: { status: { in: ['OPEN', 'IN_PROGRESS'] } } },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(users);
  } catch (err) {
    next(err);
  }
}

export async function createMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError(409, 'Email already in use', 'DUPLICATE_EMAIL');

    const password = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: { ...data, password },
      select: { id: true, name: true, email: true, role: true, color: true, isActive: true, createdAt: true },
    });

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const data = updateSchema.parse(req.body);

    if (req.user!.role !== 'ADMIN' && req.user!.userId !== id) {
      throw new AppError(403, 'Cannot update other members', 'FORBIDDEN');
    }

    if (data.email) {
      const existing = await prisma.user.findFirst({
        where: { email: data.email, NOT: { id } },
      });
      if (existing) throw new AppError(409, 'Email already in use', 'DUPLICATE_EMAIL');
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, color: true, isActive: true },
    });

    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { password } = resetPasswordSchema.parse(req.body);

    if (req.user!.role !== 'ADMIN' && req.user!.userId !== id) {
      throw new AppError(403, 'Cannot reset password for other members', 'FORBIDDEN');
    }

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id }, data: { password: hashed } });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function deleteMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    if (req.user!.userId === id) {
      throw new AppError(400, 'Cannot deactivate yourself', 'SELF_DEACTIVATE');
    }

    await prisma.user.update({ where: { id }, data: { isActive: false } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

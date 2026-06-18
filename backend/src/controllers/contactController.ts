import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});

export async function listContacts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, cursor, limit = '30' } = req.query as Record<string, string>;

    const contacts = await prisma.contact.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
            ],
          }
        : undefined,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: Number(limit),
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { conversations: true } },
      },
    });

    res.json(contacts);
  } catch (err) {
    next(err);
  }
}

export async function getContact(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const contact = await prisma.contact.findUniqueOrThrow({
      where: { id },
      include: {
        conversations: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            assignment: { include: { user: { select: { id: true, name: true, color: true } } } },
          },
        },
      },
    });

    res.json(contact);
  } catch (err) {
    next(err);
  }
}

export async function updateContact(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const data = updateSchema.parse(req.body);

    const contact = await prisma.contact.update({ where: { id }, data });
    res.json(contact);
  } catch (err) {
    next(err);
  }
}

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { evolutionService } from '../services/evolutionService';

const updateSchema = z.object({
  evolutionApiUrl: z.string().url().optional(),
  evolutionApiKey: z.string().optional(),
  evolutionInstance: z.string().optional(),
  assignmentMode: z.enum(['ROUND_ROBIN', 'LEAST_BUSY', 'MANUAL']).optional(),
  autoAssign: z.boolean().optional(),
  slaWarningMinutes: z.number().min(1).max(1440).optional(),
  slaCriticalMinutes: z.number().min(1).max(1440).optional(),
  allowMembersOverride: z.boolean().optional(),
});

export async function getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let settings = await prisma.settings.findFirst();
    if (!settings) {
      settings = await prisma.settings.create({ data: {} });
    }
    const safe = { ...settings };
    res.json(safe);
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = updateSchema.parse(req.body);
    let settings = await prisma.settings.findFirst();

    if (!settings) {
      settings = await prisma.settings.create({ data });
    } else {
      settings = await prisma.settings.update({ where: { id: settings.id }, data });
    }

    if (data.evolutionApiUrl || data.evolutionApiKey || data.evolutionInstance) {
      evolutionService.invalidateClient();
    }

    res.json(settings);
  } catch (err) {
    next(err);
  }
}

export async function testConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ok = await evolutionService.testConnection();
    res.json({ ok, message: ok ? 'Conexão estabelecida com sucesso' : 'Falha na conexão' });
  } catch (err) {
    next(err);
  }
}

export async function getConnectionState(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const state = await evolutionService.getConnectionState();
    res.json(state ?? { state: 'close' });
  } catch (err) {
    next(err);
  }
}

export async function getQRCode(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const qr = await evolutionService.getQRCode();
    if (!qr) {
      res.status(404).json({ error: 'QR Code não disponível. Verifique se a instância existe e as credenciais estão corretas.' });
      return;
    }
    res.json(qr);
  } catch (err) {
    next(err);
  }
}

export async function logoutWhatsApp(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ok = await evolutionService.logout();
    res.json({ ok, message: ok ? 'Desconectado com sucesso' : 'Falha ao desconectar' });
  } catch (err) {
    next(err);
  }
}

import axios, { AxiosInstance } from 'axios';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';

interface SendTextParams {
  number: string;
  text: string;
}

interface SendMediaParams {
  number: string;
  mediaUrl: string;
  caption?: string;
  mediatype: 'image' | 'video' | 'document' | 'audio';
  fileName?: string;
}

interface EvolutionInstanceStatus {
  instance: {
    instanceName: string;
    status: string;
  };
}

export interface EvolutionConnectionState {
  state: 'open' | 'connecting' | 'close';
  statusReason?: number;
}

export interface EvolutionQRCode {
  pairingCode: string | null;
  code: string;
  base64: string;
  count: number;
}

class EvolutionService {
  private client: AxiosInstance | null = null;

  private async getClient(): Promise<AxiosInstance> {
    if (this.client) return this.client;

    const settings = await prisma.settings.findFirst();
    const apiUrl = settings?.evolutionApiUrl ?? process.env.EVOLUTION_API_URL ?? '';
    const apiKey = settings?.evolutionApiKey ?? process.env.EVOLUTION_API_KEY ?? '';

    this.client = axios.create({
      baseURL: apiUrl,
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    return this.client;
  }

  private async getInstanceName(): Promise<string> {
    const settings = await prisma.settings.findFirst();
    return settings?.evolutionInstance ?? process.env.EVOLUTION_INSTANCE ?? '';
  }

  invalidateClient(): void {
    this.client = null;
  }

  async sendText(phone: string, text: string): Promise<string | null> {
    try {
      const client = await this.getClient();
      const instance = await this.getInstanceName();

      const res = await client.post<{ key: { id: string } }>(
        `/message/sendText/${instance}`,
        { number: phone, text } as SendTextParams,
      );

      return res.data?.key?.id ?? null;
    } catch (err) {
      logger.error('Evolution sendText failed', { phone, err });
      return null;
    }
  }

  async sendMedia(
    phone: string,
    mediaUrl: string,
    caption?: string,
    mediatype: 'image' | 'video' | 'document' | 'audio' = 'image',
    fileName?: string,
  ): Promise<string | null> {
    try {
      const client = await this.getClient();
      const instance = await this.getInstanceName();

      const res = await client.post<{ key: { id: string } }>(
        `/message/sendMedia/${instance}`,
        { number: phone, mediaUrl, caption, mediatype, fileName } as SendMediaParams,
      );

      return res.data?.key?.id ?? null;
    } catch (err) {
      logger.error('Evolution sendMedia failed', { phone, err });
      return null;
    }
  }

  async getInstanceStatus(): Promise<EvolutionInstanceStatus | null> {
    try {
      const client = await this.getClient();
      const instance = await this.getInstanceName();
      const res = await client.get<EvolutionInstanceStatus>(`/instance/fetchInstances`);
      return res.data;
    } catch (err) {
      logger.error('Evolution getInstanceStatus failed', err);
      return null;
    }
  }

  async getProfilePicture(phone: string): Promise<string | null> {
    try {
      const client = await this.getClient();
      const instance = await this.getInstanceName();
      const res = await client.get<{ profilePictureUrl: string }>(
        `/chat/fetchProfilePictureUrl/${instance}`,
        { params: { number: phone } },
      );
      return res.data?.profilePictureUrl ?? null;
    } catch {
      return null;
    }
  }

  async getConnectionState(): Promise<EvolutionConnectionState | null> {
    try {
      const client = await this.getClient();
      const instance = await this.getInstanceName();
      const res = await client.get<EvolutionConnectionState>(
        `/instance/connectionState/${instance}`,
      );
      return res.data;
    } catch (err) {
      logger.error('Evolution getConnectionState failed', err);
      return null;
    }
  }

  async getQRCode(): Promise<EvolutionQRCode | null> {
    try {
      const client = await this.getClient();
      const instance = await this.getInstanceName();
      const res = await client.get<{ base64?: string; code?: string; pairingCode?: string; count?: number }>(
        `/instance/connect/${instance}`,
      );
      const data = res.data;
      if (!data?.base64 && !data?.code) return null;
      return {
        pairingCode: data.pairingCode ?? null,
        code: data.code ?? '',
        base64: data.base64 ?? '',
        count: data.count ?? 0,
      };
    } catch (err) {
      logger.error('Evolution getQRCode failed', err);
      return null;
    }
  }

  async logout(): Promise<boolean> {
    try {
      const client = await this.getClient();
      const instance = await this.getInstanceName();
      await client.delete(`/instance/logout/${instance}`);
      return true;
    } catch (err) {
      logger.error('Evolution logout failed', err);
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const state = await this.getConnectionState();
      return state !== null;
    } catch {
      return false;
    }
  }
}

export const evolutionService = new EvolutionService();

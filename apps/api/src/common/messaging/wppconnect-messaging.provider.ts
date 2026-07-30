import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { MessagingProvider } from './messaging-provider.interface';
import {
  SessionStatus,
  QrCodeResult,
  MessageResult,
  MediaPayload,
  ContactDto,
} from '@openreach/types';

@Injectable()
export class WppConnectMessagingProvider implements MessagingProvider {
  private readonly logger = new Logger(WppConnectMessagingProvider.name);
  private readonly baseUrl: string;
  private readonly secretKey: string;

  constructor() {
    this.baseUrl = process.env.WPPCONNECT_URL || 'http://localhost:21465';
    this.secretKey = process.env.WPPCONNECT_SECRET_KEY || 'THISISMYSECURETOKEN';
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  async createSession(sessionId: string): Promise<QrCodeResult> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/${sessionId}/start-session`,
        { webhook: `${process.env.API_URL || 'http://localhost:4000'}/api/v1/whatsapp-sessions/webhook` },
        { headers: this.headers },
      );
      return {
        sessionId,
        qrCodeBase64: response.data?.qrcode,
        status: response.data?.status === 'CONNECTED' ? 'CONNECTED' : 'SCAN_QR_CODE',
      };
    } catch (error: any) {
      this.logger.error(`Error creating session ${sessionId}:`, error.message);
      return {
        sessionId,
        status: 'DISCONNECTED',
      };
    }
  }

  async getSession(sessionId: string): Promise<SessionStatus> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/${sessionId}/status-session`, {
        headers: this.headers,
      });
      const status = response.data?.status;
      if (status === 'CONNECTED' || status === 'inChat') return 'CONNECTED';
      if (status === 'qrReadSuccess' || status === 'isLogged') return 'CONNECTED';
      if (status === 'notLogged' || status === 'browserClosed') return 'DISCONNECTED';
      return 'STARTING';
    } catch {
      return 'DISCONNECTED';
    }
  }

  async sendMessage(sessionId: string, to: string, text: string): Promise<MessageResult> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/${sessionId}/send-message`,
        { phone: to, message: text },
        { headers: this.headers },
      );
      return {
        messageId: response.data?.response?.[0]?.id || `msg-${Date.now()}`,
        status: 'SENT',
      };
    } catch (error: any) {
      this.logger.error(`Failed sending message to ${to}:`, error.message);
      return {
        messageId: `msg-failed-${Date.now()}`,
        status: 'FAILED',
        error: error.message,
      };
    }
  }

  async sendMedia(sessionId: string, to: string, media: MediaPayload): Promise<MessageResult> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/${sessionId}/send-file-base64`,
        {
          phone: to,
          base64: media.url,
          filename: media.filename || 'file',
          caption: media.caption || '',
        },
        { headers: this.headers },
      );
      return {
        messageId: response.data?.response?.[0]?.id || `msg-${Date.now()}`,
        status: 'SENT',
      };
    } catch (error: any) {
      return {
        messageId: `msg-failed-${Date.now()}`,
        status: 'FAILED',
        error: error.message,
      };
    }
  }

  async reconnect(sessionId: string): Promise<void> {
    await this.createSession(sessionId);
  }

  async disconnect(sessionId: string): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/api/${sessionId}/logout-session`, {}, { headers: this.headers });
    } catch (error: any) {
      this.logger.warn(`Failed disconnecting session ${sessionId}:`, error.message);
    }
  }

  async getContacts(sessionId: string): Promise<ContactDto[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/${sessionId}/all-contacts`, {
        headers: this.headers,
      });
      const contacts = response.data?.response || [];
      return contacts.map((c: any) => ({
        id: c.id?.user || c.id,
        organizationId: '',
        sessionId,
        phone: c.id?.user || c.phone || '',
        name: c.name || c.formattedName || c.pushname || c.phone,
        tags: [],
        createdAt: new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  }
}

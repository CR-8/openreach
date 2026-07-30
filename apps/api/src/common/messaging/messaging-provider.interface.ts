import {
  SessionStatus,
  QrCodeResult,
  MessageResult,
  MediaPayload,
  ContactDto,
} from '@openreach/types';

export interface MessagingProvider {
  sendMessage(sessionId: string, to: string, text: string): Promise<MessageResult>;
  sendMedia(sessionId: string, to: string, media: MediaPayload): Promise<MessageResult>;
  getSession(sessionId: string): Promise<SessionStatus>;
  createSession(sessionId: string): Promise<QrCodeResult>;
  reconnect(sessionId: string): Promise<void>;
  disconnect(sessionId: string): Promise<void>;
  getContacts(sessionId: string): Promise<ContactDto[]>;
}

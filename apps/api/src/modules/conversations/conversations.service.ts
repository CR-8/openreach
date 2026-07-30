import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WppConnectMessagingProvider } from '../../common/messaging/wppconnect-messaging.provider';
import { WhatsappGateway } from '../whatsapp/whatsapp.gateway';
import { MessageDirection, MessageType } from '@prisma/client';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: WppConnectMessagingProvider,
    private readonly gateway: WhatsappGateway,
  ) {}

  async listConversations(organizationId: string, status?: string) {
    return this.prisma.conversation.findMany({
      where: {
        organizationId,
        ...(status ? { status } : {}),
      },
      include: {
        contact: true,
        assignedUser: { select: { id: true, name: true, email: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async getConversation(organizationId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, organizationId },
      include: {
        contact: true,
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  async getMessages(organizationId: string, conversationId: string) {
    await this.getConversation(organizationId, conversationId);
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(organizationId: string, conversationId: string, content: string, mediaUrl?: string) {
    const conversation = await this.getConversation(organizationId, conversationId);
    const contact = conversation.contact;

    // Send via WppConnect
    let result;
    if (mediaUrl) {
      result = await this.provider.sendMedia(contact.sessionId, contact.phone, {
        url: mediaUrl,
        mimetype: 'image/jpeg',
      });
    } else {
      result = await this.provider.sendMessage(contact.sessionId, contact.phone, content);
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        direction: MessageDirection.OUTBOUND,
        type: mediaUrl ? MessageType.IMAGE : MessageType.TEXT,
        content,
        mediaUrl: mediaUrl || null,
        aiGenerated: false,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    this.gateway.broadcastMessageCreated(organizationId, conversationId, message);
    return message;
  }

  async toggleAi(organizationId: string, conversationId: string, aiEnabled: boolean) {
    await this.getConversation(organizationId, conversationId);
    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { aiEnabled },
      include: { contact: true },
    });
    this.gateway.broadcastConversationUpdated(organizationId, updated);
    return updated;
  }

  async assignAgent(organizationId: string, conversationId: string, userId: string | null) {
    await this.getConversation(organizationId, conversationId);
    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { assignedUserId: userId },
      include: { contact: true, assignedUser: true },
    });
    this.gateway.broadcastConversationUpdated(organizationId, updated);
    return updated;
  }
}

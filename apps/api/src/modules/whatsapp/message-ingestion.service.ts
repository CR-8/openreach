import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WhatsappGateway } from './whatsapp.gateway';
import { MessageDirection, MessageType } from '@prisma/client';

@Injectable()
export class MessageIngestionService {
  private readonly logger = new Logger(MessageIngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: WhatsappGateway,
  ) {}

  async handleInboundWebhook(payload: any) {
    this.logger.log('Processing inbound webhook:', JSON.stringify(payload).substring(0, 150));

    // Extract fields from WPPConnect payload format
    const sessionId = payload.session || payload.sessionId || 'default-session';
    const senderPhone = payload.from || payload.sender?.id || payload.phone;
    const body = payload.body || payload.content || payload.caption || '';
    const isGroup = payload.isGroupMsg || payload.isGroup || false;

    if (!senderPhone || isGroup) {
      return { success: false, reason: 'Invalid or group message ignored' };
    }

    const cleanPhone = String(senderPhone).replace('@c.us', '').replace(/[^0-9]/g, '');

    // Find WhatsApp session in DB
    const session = await this.prisma.whatsappSession.findFirst({
      where: { sessionId },
    });

    if (!session) {
      this.logger.warn(`Session ${sessionId} not registered in database`);
      return { success: false, reason: 'Session not found' };
    }

    const organizationId = session.organizationId;

    // Upsert Contact
    const contact = await this.prisma.contact.upsert({
      where: {
        organizationId_phone: {
          organizationId,
          phone: cleanPhone,
        },
      },
      update: {
        name: payload.sender?.name || payload.sender?.pushname || cleanPhone,
      },
      create: {
        organizationId,
        sessionId,
        phone: cleanPhone,
        name: payload.sender?.name || payload.sender?.pushname || cleanPhone,
      },
    });

    // Upsert Conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        organizationId,
        contactId: contact.id,
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          organizationId,
          contactId: contact.id,
          status: 'OPEN',
          aiEnabled: true,
          lastMessageAt: new Date(),
        },
      });
    } else {
      conversation = await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });
    }

    // Save Message
    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: MessageDirection.INBOUND,
        type: payload.type === 'image' ? MessageType.IMAGE : MessageType.TEXT,
        content: body,
        mediaUrl: payload.mediaUrl || payload.deprecatedMms3Url || null,
        aiGenerated: false,
      },
    });

    // Broadcast Realtime Events
    this.gateway.broadcastMessageCreated(organizationId, conversation.id, message);
    this.gateway.broadcastConversationUpdated(organizationId, conversation);

    return {
      success: true,
      organizationId,
      conversationId: conversation.id,
      messageId: message.id,
      aiEnabled: conversation.aiEnabled,
      content: body,
    };
  }
}

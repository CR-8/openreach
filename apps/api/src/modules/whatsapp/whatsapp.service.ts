import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WppConnectMessagingProvider } from '../../common/messaging/wppconnect-messaging.provider';
import { WhatsappGateway } from './whatsapp.gateway';
import { MessageIngestionService } from './message-ingestion.service';
import { WhatsappSessionStatus } from '@prisma/client';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: WppConnectMessagingProvider,
    private readonly gateway: WhatsappGateway,
    private readonly ingestion: MessageIngestionService,
  ) {}

  async listSessions(organizationId: string) {
    return this.prisma.whatsappSession.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createOrStartSession(organizationId: string, sessionId: string) {
    let session = await this.prisma.whatsappSession.findFirst({
      where: { organizationId, sessionId },
    });

    if (!session) {
      session = await this.prisma.whatsappSession.create({
        data: {
          organizationId,
          sessionId,
          provider: 'wppconnect',
          status: WhatsappSessionStatus.STARTING,
        },
      });
    }

    const qrResult = await this.provider.createSession(sessionId);

    const updatedSession = await this.prisma.whatsappSession.update({
      where: { id: session.id },
      data: {
        status: qrResult.status as WhatsappSessionStatus,
        qrCodeUrl: qrResult.qrCodeBase64 || null,
      },
    });

    this.gateway.broadcastSessionStatus(
      organizationId,
      sessionId,
      updatedSession.status,
      updatedSession.qrCodeUrl || undefined,
    );

    return updatedSession;
  }

  async getSessionStatus(organizationId: string, sessionId: string) {
    const session = await this.prisma.whatsappSession.findFirst({
      where: { organizationId, sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const liveStatus = await this.provider.getSession(sessionId);
    const updated = await this.prisma.whatsappSession.update({
      where: { id: session.id },
      data: { status: liveStatus as WhatsappSessionStatus },
    });

    return updated;
  }

  async disconnectSession(organizationId: string, sessionId: string) {
    const session = await this.prisma.whatsappSession.findFirst({
      where: { organizationId, sessionId },
    });

    if (session) {
      await this.provider.disconnect(sessionId);
      await this.prisma.whatsappSession.update({
        where: { id: session.id },
        data: { status: WhatsappSessionStatus.DISCONNECTED, qrCodeUrl: null },
      });
    }

    return { success: true };
  }

  async handleWebhook(payload: any) {
    return this.ingestion.handleInboundWebhook(payload);
  }
}

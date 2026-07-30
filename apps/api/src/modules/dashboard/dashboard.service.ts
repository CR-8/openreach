import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(organizationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [messagesToday, activeConversations, sessions, recentConversations] = await Promise.all([
      this.prisma.message.count({
        where: {
          conversation: { organizationId },
          createdAt: { gte: today },
        },
      }),
      this.prisma.conversation.count({
        where: { organizationId, status: 'OPEN' },
      }),
      this.prisma.whatsappSession.findMany({
        where: { organizationId },
        select: { sessionId: true, status: true, phoneNumber: true },
      }),
      this.prisma.conversation.findMany({
        where: { organizationId },
        take: 5,
        orderBy: { lastMessageAt: 'desc' },
        include: {
          contact: true,
          messages: { take: 1, orderBy: { createdAt: 'desc' } },
        },
      }),
    ]);

    const totalAiMessages = await this.prisma.message.count({
      where: {
        conversation: { organizationId },
        aiGenerated: true,
      },
    });

    const totalMessages = await this.prisma.message.count({
      where: { conversation: { organizationId } },
    });

    const aiResponseRate = totalMessages > 0 ? Math.round((totalAiMessages / totalMessages) * 100) : 0;

    return {
      stats: {
        messagesToday,
        activeConversations,
        aiResponseRate,
        connectedSessions: sessions.filter((s) => s.status === 'CONNECTED').length,
      },
      sessions,
      recentConversations,
    };
  }
}

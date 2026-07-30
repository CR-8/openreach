import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics(organizationId: string) {
    const aiMessageCount = await this.prisma.message.count({
      where: { conversation: { organizationId }, aiGenerated: true },
    });

    const humanMessageCount = await this.prisma.message.count({
      where: { conversation: { organizationId }, aiGenerated: false, direction: 'OUTBOUND' },
    });

    const totalInbound = await this.prisma.message.count({
      where: { conversation: { organizationId }, direction: 'INBOUND' },
    });

    return {
      responseSplit: [
        { name: 'AI Generated', count: aiMessageCount },
        { name: 'Human Agent', count: humanMessageCount },
      ],
      volume: {
        inbound: totalInbound,
        outbound: aiMessageCount + humanMessageCount,
      },
      estimatedCost: `$${(aiMessageCount * 0.002).toFixed(2)}`,
    };
  }
}

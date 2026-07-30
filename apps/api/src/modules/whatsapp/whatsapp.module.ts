import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { WhatsappGateway } from './whatsapp.gateway';
import { MessageIngestionService } from './message-ingestion.service';
import { WppConnectMessagingProvider } from '../../common/messaging/wppconnect-messaging.provider';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  controllers: [WhatsappController],
  providers: [
    WhatsappService,
    WhatsappGateway,
    MessageIngestionService,
    WppConnectMessagingProvider,
    PrismaService,
  ],
  exports: [WhatsappService, WhatsappGateway, MessageIngestionService, WppConnectMessagingProvider],
})
export class WhatsappModule {}

import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  imports: [WhatsappModule],
  controllers: [ConversationsController],
  providers: [ConversationsService, PrismaService],
  exports: [ConversationsService],
})
export class ConversationsModule {}

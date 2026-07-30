import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './common/prisma/prisma.service';
import { AuthModule } from './modules/auth/auth.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { AiModule } from './modules/ai/ai.module';
import { PromptsModule } from './modules/prompts/prompts.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    WhatsappModule,
    ConversationsModule,
    AiModule,
    PromptsModule,
    WorkflowsModule,
    DashboardModule,
    AnalyticsModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}

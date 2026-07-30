import { Module } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';
import { WorkflowExecutorService } from './workflow-executor.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { AiModule } from '../ai/ai.module';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  imports: [WhatsappModule, AiModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowExecutorService, PrismaService],
  exports: [WorkflowsService, WorkflowExecutorService],
})
export class WorkflowsModule {}

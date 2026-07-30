import { Module } from '@nestjs/common';
import { PromptsController } from './prompts.controller';
import { PromptsService } from './prompts.service';
import { AiModule } from '../ai/ai.module';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  imports: [AiModule],
  controllers: [PromptsController],
  providers: [PromptsService, PrismaService],
  exports: [PromptsService],
})
export class PromptsModule {}

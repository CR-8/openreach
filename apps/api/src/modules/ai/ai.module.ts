import { Module } from '@nestjs/common';
import { AiProvidersController } from './ai-providers.controller';
import { AiService } from './ai.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  controllers: [AiProvidersController],
  providers: [AiService, PrismaService],
  exports: [AiService],
})
export class AiModule {}

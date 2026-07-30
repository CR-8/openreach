import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrapWorker() {
  const logger = new Logger('WorkerMain');
  const app = await NestFactory.createApplicationContext(AppModule);

  logger.log('OpenReach BullMQ background worker started successfully');

  process.on('SIGINT', async () => {
    logger.log('Shutting down background worker...');
    await app.close();
    process.exit(0);
  });
}
bootstrapWorker();

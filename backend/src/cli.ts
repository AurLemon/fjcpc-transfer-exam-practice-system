// src/cli.ts

import { NestFactory } from '@nestjs/core';
import { CommandModule, CommandService } from 'nestjs-command';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });

  try {
    await app.select(CommandModule).get(CommandService).exec();
  } catch (error) {
    console.error('Error executing command:', error);
  } finally {
    await app.close();
  }
}

bootstrap();

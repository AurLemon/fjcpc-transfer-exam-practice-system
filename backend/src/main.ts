import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import config from './config/config';

async function bootstrap() {
  if (!config().jwt.secret) {
    throw new Error(
      'JWT_SECRET must be configured before starting the server.',
    );
  }

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  await app.listen(config().port);
}
bootstrap();

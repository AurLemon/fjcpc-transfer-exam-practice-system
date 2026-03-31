import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { getCommitInfo } from './api/api';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  const {
    local_commit,
    repo_commit,
    recent_commit,
    local_commit_time,
    repo_commit_time,
    local_commit_message,
    repo_commit_message,
  } = await getCommitInfo();
  process.env.LOCAL_COMMIT_HASH = local_commit;
  process.env.REPO_COMMIT_HASH = repo_commit;
  process.env.LOCAL_COMMIT_TIME = local_commit_time.toString();
  process.env.REPO_COMMIT_TIME = repo_commit_time.toString();
  process.env.LOCAL_COMMIT_MESSAGE = local_commit_message;
  process.env.REPO_COMMIT_MESSAGE = repo_commit_message;
  process.env.RECENT_COMMIT = recent_commit;

  await app.listen(3000);
}
bootstrap();

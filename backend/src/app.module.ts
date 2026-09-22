// src/app.module

import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';

import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { resolve } from 'node:path';

import config from './config/config';

import { databaseOptions, entities } from './database/database.config';
import { RedisModule } from './redis/redis.module';

import { ExportModule } from './export/export.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { QuestionModule } from './question/question.module';
import { CryptoModule } from './common/crypto.module';
import { MigrateService } from './migrate/migrate.service';
import { HealthController } from './health.controller';

@Module({
  imports: [
    CommandModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(process.cwd(), '.env'),
        resolve(process.cwd(), '../.env'),
      ],
      load: [config],
    }),
    RedisModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async () => databaseOptions(),
    }),
    TypeOrmModule.forFeature(entities),
    AuthModule,
    UserModule,
    QuestionModule,
    AdminModule,
    CryptoModule,
    ExportModule,
  ],
  controllers: [HealthController],
  providers: [MigrateService],
})
export class AppModule {}

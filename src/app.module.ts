// src/app.module

import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';

import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import config from './config/config';

import { User } from './database/entities/user.entity';
import { UserSetting } from './database/entities/user_setting.entity';
import { Token } from './database/entities/token.entity';
import { LoginKey } from './database/entities/login_key.entity';
import { RequestInfo } from './database/entities/request_info.entity';
import { RequestLog } from './database/entities/request_log.entity';
import { Question } from './database/entities/question.entity';
import { DoneQuestion } from './database/entities/done_question.entity';
import { StarQuestion } from './database/entities/star_question.entity';
import { UpdatedQuestion } from './database/entities/updated_question.entity';
import { RedisModule } from './redis/redis.module';

import { ExportModule } from './export/export.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { QuestionModule } from './question/question.module';
import { CryptoModule } from './common/crypto.module';
import { MigrateService } from './migrate/migrate.service';

@Module({
  imports: [
    CommandModule,
    ConfigModule.forRoot({ load: [config] }),
    RedisModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const dbType = configService.get<string>('database.type');
        if (dbType === 'sqlite') {
          return {
            type: 'sqlite',
            database: configService.get<string>('database.sqlitePath'),
            entities: [
              User,
              UserSetting,
              Token,
              LoginKey,
              RequestInfo,
              RequestLog,
              Question,
              DoneQuestion,
              StarQuestion,
              UpdatedQuestion,
            ],
            synchronize: true,
          };
        } else if (dbType === 'mysql') {
          return {
            type: 'mysql',
            host: configService.get<string>('database.host'),
            port: configService.get<number>('database.port'),
            username: configService.get<string>('database.user'),
            password: configService.get<string>('database.password'),
            database: configService.get<string>('database.name'),
            entities: [
              User,
              UserSetting,
              Token,
              LoginKey,
              RequestInfo,
              RequestLog,
              Question,
              DoneQuestion,
              StarQuestion,
              UpdatedQuestion,
            ],
            synchronize: true,
          };
        }
      },
    }),
    TypeOrmModule.forFeature([
      User,
      UserSetting,
      Question,
      DoneQuestion,
      StarQuestion,
      RequestInfo,
    ]),
    AuthModule,
    UserModule,
    QuestionModule,
    AdminModule,
    CryptoModule,
    ExportModule,
  ],
  providers: [MigrateService, RedisModule],
})
export class AppModule {}

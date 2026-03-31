// src/user/user.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TokenModule } from '../auth/token.module';
import { CryptoModule } from '../common/crypto.module';

import { User } from '../database/entities/user.entity';
import { UserSetting } from '../database/entities/user_setting.entity';
import { Question } from '../database/entities/question.entity';
import { RequestInfo } from '../database/entities/request_info.entity';
import { DoneQuestion } from '../database/entities/done_question.entity';
import { StarQuestion } from '../database/entities/star_question.entity';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserSetting,
      Question,
      DoneQuestion,
      StarQuestion,
      RequestInfo,
    ]),
    forwardRef(() => TokenModule),
    CryptoModule,
    RedisModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}

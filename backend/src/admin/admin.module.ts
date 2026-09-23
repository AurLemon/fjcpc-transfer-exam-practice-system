// src/admin/admin.module

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { RequestInfo } from '../database/entities/request_info.entity';
import { RequestLog } from '../database/entities/request_log.entity';
import { QuestionModule } from '../question/question.module';
import { TokenModule } from '../auth/token.module';
import { CryptoModule } from '../common/crypto.module';
import { UserModule } from '../user/user.module';
import { User } from '../database/entities/user.entity';
import { UserService } from '../user/user.service';
import { UserSetting } from '../database/entities/user_setting.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RequestInfo, RequestLog, User, UserSetting]),
    QuestionModule,
    TokenModule,
    CryptoModule,
    UserModule,
  ],
  controllers: [AdminController],
  providers: [],
})
export class AdminModule {}

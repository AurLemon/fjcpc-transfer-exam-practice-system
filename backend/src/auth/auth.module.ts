// src/auth/auth.module

import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { UserService } from '../user/user.service';
import { TokenModule } from './token.module';
import { CryptoModule } from '../common/crypto.module';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../database/entities/user.entity';
import { UserSetting } from '../database/entities/user_setting.entity';
import { RequestInfo } from '../database/entities/request_info.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserSetting, RequestInfo]),
    TokenModule,
    CryptoModule,
  ],
  controllers: [AuthController],
  providers: [UserService],
})
export class AuthModule {}

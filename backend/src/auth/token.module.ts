// src/auth/token.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Token } from '../database/entities/token.entity';
import { TokenService } from './token.service';
import { User } from '../database/entities/user.entity';
import { UserModule } from '../user/user.module';
import { CryptoModule } from '../common/crypto.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Token, User]),
    forwardRef(() => UserModule),
    CryptoModule,
  ],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}

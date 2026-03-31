// src/common/crypto.module

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoUtil } from './crypto.util';
import { LoginKey } from '../database/entities/login_key.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LoginKey])],
  providers: [CryptoUtil],
  exports: [CryptoUtil],
})
export class CryptoModule {}

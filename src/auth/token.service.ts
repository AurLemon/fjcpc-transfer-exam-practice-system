// src/auth/token.service

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Token } from '../database/entities/token.entity';
import { User } from '../database/entities/user.entity';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { CryptoUtil } from '../common/crypto.util';
import { UserService } from '../user/user.service';

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly userService: UserService,
    private readonly cryptoUtil: CryptoUtil,
  ) {}

  async generateTokens(userUuid: string): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    const access_token_expiry = Date.now() + 60 * 60 * 1000; // 1小时
    const refresh_token_expiry = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7天

    const user = await this.userRepository.findOne({
      where: { uuid: userUuid },
    });

    if (!user) {
      throw new Error('用户不存在，无法生成 Token');
    }

    // 生成 access_token 时附加用户权限信息
    const access_token = jwt.sign(
      {
        exp: access_token_expiry,
        permission: user.permission, // 添加用户权限
        uuid: userUuid, // 可用于后续用户身份验证
      },
      'secret',
      { algorithm: 'HS256' },
    );

    const refresh_token = uuidv4();

    const token = new Token();
    token.uuid = userUuid;
    token.access_token = access_token;
    token.refresh_token = refresh_token;
    token.access_token_expiry = access_token_expiry;
    token.refresh_token_expiry = refresh_token_expiry;

    await this.tokenRepository.save(token);

    return { access_token, refresh_token };
  }

  // 根据 refresh_token 生成新的 access_token 和 refresh_token
  async refreshTokens(
    refresh_token: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const token = await this.tokenRepository.findOne({
      where: { refresh_token },
    });

    if (!token || Date.now() > token.refresh_token_expiry) {
      throw new Error('Refresh Token 不合法或已过期');
    }

    const newTokens = await this.generateTokens(token.uuid);

    token.access_token = newTokens.access_token;
    token.refresh_token = newTokens.refresh_token;
    token.access_token_expiry = Date.now() + 60 * 60 * 1000;
    token.refresh_token_expiry = Date.now() + 7 * 24 * 60 * 60 * 1000;

    await this.tokenRepository.save(token);

    return newTokens;
  }

  // 验证 Token
  async validateAccessToken(access_token: string): Promise<{
    valid: boolean;
    reason: string;
    message: string;
    result?: {
      uuid: string;
      nick: string | null;
      id_number: string | null;
      name: string | null;
      school: string | null;
      profession: string | null;
      profession_main_subject: number;
      last_login: Date;
      reg_date: Date;
      permission: number;
    };
  }> {
    const token = await this.tokenRepository.findOne({
      where: { access_token },
    });

    if (!token) {
      return { valid: false, reason: 'not_exist', message: 'Token 不存在' };
    }

    if (Date.now() > token.access_token_expiry) {
      return {
        valid: false,
        reason: 'expiry',
        message: 'Token 已过期',
      };
    }

    try {
      const decoded = jwt.verify(access_token, 'secret', {
        algorithms: ['HS256'],
      });
      const { uuid } = decoded as { uuid: string };

      const user = await this.userService.findUserByUuid(uuid);

      if (!user) {
        return {
          valid: false,
          reason: 'not_exist',
          message: '用户不存在',
        };
      }

      let encryptedIdNumber: string,
        idNumberKey: string,
        decryptedIdNumber: string;

      if (user.id_number) {
        [encryptedIdNumber, idNumberKey] = user.id_number.split('$');
        decryptedIdNumber = this.cryptoUtil.aesDecrypt(
          encryptedIdNumber,
          idNumberKey,
        );
      }

      let encryptedName: string, nameKey: string, decryptedName: string;

      if (user.name) {
        [encryptedName, nameKey] = user.name.split('$');
        decryptedName = this.cryptoUtil.aesDecrypt(encryptedName, nameKey);
      }

      await this.updateLastLogin(user.uuid);

      return {
        valid: true,
        reason: 'success',
        message: 'Token 有效',
        result: {
          uuid: user.uuid,
          nick: user.nick || null,
          id_number: decryptedIdNumber || null,
          name: decryptedName || null,
          school: user.school || null,
          profession: user.profession || null,
          profession_main_subject: user.profession_main_subject,
          last_login: user.last_login,
          reg_date: user.reg_date,
          permission: user.permission,
        },
      };
    } catch (err) {
      console.log(err);

      return {
        valid: false,
        reason: 'unexpected_error',
        message: err.message,
      };
    }
  }

  // 更新用户的 last_login 字段
  async updateLastLogin(uuid: string): Promise<void> {
    await this.userRepository.update(uuid, { last_login: new Date() });
  }

  // 根据 token 返回用户权限
  async getPermissionFromToken(access_token: string): Promise<number> {
    const token = await this.tokenRepository.findOne({
      where: { access_token },
    });

    if (!token) {
      throw new Error('Token 不存在');
    }

    if (Date.now() > token.access_token_expiry) {
      throw new Error('Token 已过期');
    }

    try {
      const decoded = jwt.verify(access_token, 'secret', {
        algorithms: ['HS256'],
      });
      const { permission } = decoded as { permission: number }; // 提取权限

      return permission; // 返回用户权限
    } catch {
      throw new Error('Token 无效');
    }
  }

  // 清除已过期的 token
  async cleanupExpiredTokens(): Promise<void> {
    const expiredTokens = await this.tokenRepository
      .createQueryBuilder()
      .where('access_token_expiry < :now OR refresh_token_expiry < :now', {
        now: Date.now(),
      })
      .getMany();

    for (const token of expiredTokens) {
      await this.tokenRepository.remove(token);
    }
  }
}

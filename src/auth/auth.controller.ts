// src/auth/auth.controller

import { pinyin as pinyinPro } from 'pinyin-pro';

import { Controller, Get, Post, Body } from '@nestjs/common';
import { CryptoUtil } from '../common/crypto.util';
import { ApiResponseUtil } from '../common/api.response';
import { verifyIdNumber } from '../api/api';
import { TokenService } from './token.service';
import { UserService } from '../user/user.service';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestInfo } from '../database/entities/request_info.entity';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly cryptoUtil: CryptoUtil,
    private readonly tokenService: TokenService,
    private readonly userService: UserService,

    @InjectRepository(RequestInfo)
    private readonly requestInfoRepository: Repository<RequestInfo>,
  ) {}

  @Get('login')
  async publicKey() {
    const publicKey = await this.cryptoUtil.getPublicKey();
    return ApiResponseUtil.success(200, {
      public_key: publicKey,
    });
  }

  @Post('login')
  async login(@Body() body) {
    const generateNick = (name: string): string => {
      if (!name) return 'User';

      const namePinyin = pinyinPro(name, {
        toneType: 'none',
      });

      return namePinyin.replace(/\s/g, '');
    };

    const { nick, id_number, password } = body;

    if (nick && /^\d+$/.test(nick)) {
      return ApiResponseUtil.error(
        400,
        'nick_invalid',
        '昵称不能是纯数字，请使用包含字母的组合',
      );
    }

    if (!id_number && !nick) {
      return ApiResponseUtil.error(
        401,
        'unauthorized',
        '需要传入id_number或nick',
      );
    }

    const safePassword = password || 'empty';

    try {
      let decryptedIdNumber: string | null = null;
      let decryptedPassword: string = safePassword;

      if (id_number) {
        decryptedIdNumber = await this.cryptoUtil.decryptWithSM2(id_number);
        decryptedPassword =
          safePassword === 'empty'
            ? 'empty'
            : await this.cryptoUtil.decryptWithSM2(safePassword);
      } else {
        decryptedPassword = await this.cryptoUtil.decryptWithSM2(safePassword);
      }

      let existingUser;

      if (id_number) {
        existingUser = await this.userService.findByIdNumber(decryptedIdNumber);
      } else {
        existingUser = await this.userService.findByNick(nick);
      }

      if (existingUser) {
        if (!existingUser.nick) {
          const generatedNick = generateNick(
            (() => {
              const [encryptedName, nameKey] = existingUser.name.split('$');
              const decryptedName = this.cryptoUtil.aesDecrypt(
                encryptedName,
                nameKey,
              );
              return decryptedName;
            })(),
          );
          await this.userService.updateNick(existingUser.uuid, generatedNick);
          existingUser.nick = generatedNick;
        }

        if (
          !(await this.userService.checkPassword(
            id_number ? decryptedIdNumber : nick,
            decryptedPassword,
          ))
        ) {
          return ApiResponseUtil.error(403, 'password_incorrect', '密码错误');
        }

        const tokens = await this.tokenService.generateTokens(
          existingUser.uuid,
        );
        await this.tokenService.updateLastLogin(existingUser.uuid);
        return ApiResponseUtil.success(200, { type: 'login', tokens });
      }

      if (id_number) {
        const apiResponse = await verifyIdNumber(decryptedIdNumber);

        if (apiResponse?.data?.outmap?.err === '身份证错误！') {
          return ApiResponseUtil.error(404, 'no_detected', '身份证不合法');
        }

        if (apiResponse?.data?.outmap?.err === 'success') {
          const userInfo = apiResponse.data.outmap.xs;
          const requestInfo = await this.requestInfoRepository.findOne({
            where: { profession_name: userInfo.zy },
          });

          const mainSubject = requestInfo ? requestInfo.subject : 0;

          const newUser = await this.userService.createUser(
            decryptedIdNumber,
            generateNick(userInfo.xm),
            userInfo.xm,
            decryptedPassword,
            userInfo.xx,
            userInfo.zy,
            mainSubject,
          );

          const tokens = await this.tokenService.generateTokens(newUser.uuid);
          return ApiResponseUtil.success(200, { type: 'register', tokens });
        } else {
          return ApiResponseUtil.error(
            500,
            'unexpected_error',
            '身份证验证失败',
          );
        }
      } else {
        const existingNickUser = await this.userService.findByNick(nick);
        if (existingNickUser) {
          return ApiResponseUtil.error(
            409,
            'nick_exists',
            '该昵称已被占用，请更换其他昵称',
          );
        }

        const newUser = await this.userService.createUser(
          null,
          nick,
          null,
          decryptedPassword,
          null,
          null,
          1,
        );

        const tokens = await this.tokenService.generateTokens(newUser.uuid);
        return ApiResponseUtil.success(200, { type: 'register', tokens });
      }
    } catch (err) {
      return ApiResponseUtil.error(500, 'unexpected_error', err.message);
    }
  }

  @Post('reset')
  async resetPassword(@Body() body) {
    const { id_number, realname, new_password } = body;

    if (!id_number || !realname) {
      return ApiResponseUtil.error(401, 'unauthorized', '需要传入参数');
    }

    const safePassword = new_password || 'empty';

    try {
      const decryptedIdNumber = await this.cryptoUtil.decryptWithSM2(id_number);
      const decryptedRealName = await this.cryptoUtil.decryptWithSM2(realname);

      const existingUser = await this.userService.findByIdNumberAndName(
        decryptedIdNumber,
        decryptedRealName,
      );

      if (!existingUser) {
        return ApiResponseUtil.error(
          404,
          'user_not_found',
          '用户不存在或信息不匹配',
        );
      }

      const plaintextPassword =
        safePassword === 'empty'
          ? 'empty'
          : await this.cryptoUtil.decryptWithSM2(safePassword);

      if (
        plaintextPassword !== 'empty' &&
        !/^[0-9]{6}$/.test(plaintextPassword)
      ) {
        return ApiResponseUtil.error(500, 'password_illegal', '密码不合法');
      }

      const updateSuccess = await this.userService.updatePassword(
        existingUser.uuid,
        plaintextPassword,
      );

      if (!updateSuccess) {
        return ApiResponseUtil.error(
          404,
          'user_not_found',
          '无法更新密码，用户未找到',
        );
      }

      return ApiResponseUtil.success(200, 'Password reset successfully');
    } catch (err) {
      return ApiResponseUtil.error(500, 'unexpected_error', err.message);
    }
  }

  @Post('refresh')
  async refresh(@Body() body) {
    const { refresh_token } = body;

    if (!refresh_token) {
      return ApiResponseUtil.error(
        400,
        'lack_refresh_token',
        '需要传入 Refresh Token',
      );
    }

    try {
      const newTokens = await this.tokenService.refreshTokens(refresh_token);

      return ApiResponseUtil.success(200, newTokens);
    } catch (err) {
      return ApiResponseUtil.error(401, 'Unauthorized', err.message);
    }
  }
}

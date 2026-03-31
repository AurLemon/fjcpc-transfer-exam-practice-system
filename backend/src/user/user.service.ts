// src/user/user.service

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { UserSetting } from '../database/entities/user_setting.entity';
import { CryptoUtil } from '../common/crypto.util';
import { verifyIdNumber } from '../api/api';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSetting)
    private readonly userSettingRepository: Repository<UserSetting>,
    private readonly cryptoUtil: CryptoUtil,
  ) {}

  // 生成随机 Key
  private generateRandomKey(): string {
    return Array.from({ length: 8 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('');
  }

  // 查找用户，仅根据身份证号查找
  async findByIdNumber(id_number: string): Promise<User | null> {
    const hashedIdNumber = this.cryptoUtil.hashEncrypt(id_number);

    const user = await this.userRepository.findOne({
      where: { identifier: hashedIdNumber },
    });

    if (user) {
      return user;
    }

    const users = await this.userRepository.find();
    for (const user of users) {
      const [encryptedData, key] = user.id_number.split('$');
      const decryptedIdNumber = this.cryptoUtil.aesDecrypt(encryptedData, key);
      if (decryptedIdNumber === id_number) {
        return user;
      }
    }

    return null;
  }

  // 更新用户昵称
  async updateNick(uuid: string, nick: string): Promise<void> {
    await this.userRepository.update(uuid, { nick });
  }

  // 检查用户的密码是否正确（根据身份证号或昵称）
  async checkPassword(identifier: string, password: string): Promise<boolean> {
    const idNumberRegex = /^[1-9]\d{14}(\d{2}[0-9Xx])?$/;

    if (idNumberRegex.test(identifier)) {
      const user = await this.findByIdNumber(identifier);
      if (user) {
        return this.validatePassword(user, password);
      }
    } else {
      const user = await this.findByNick(identifier);

      if (user) {
        return this.validatePassword(user, password);
      }
    }

    return false;
  }

  // 私有方法：验证密码逻辑
  private validatePassword(user: User, password: string): boolean {
    const [storedEncryptedPassword, storedKey] = user.password.split('$');
    let encryptedPassword;

    if (password === 'empty') {
      encryptedPassword = this.cryptoUtil.aesEncrypt('empty', storedKey);
    } else {
      encryptedPassword = this.cryptoUtil.aesEncrypt(password, storedKey);
    }

    return storedEncryptedPassword === encryptedPassword;
  }

  // 新增用户
  async createUser(
    id_number: string | null,
    nick: string | null,
    name: string | null,
    password: string,
    school: string | null,
    profession: string | null,
    main_subject: number,
  ): Promise<User> {
    if (!id_number && !nick) {
      throw new Error('Must provide id number or nick');
    }

    const regDate = new Date();

    const identifier = this.cryptoUtil.hashEncrypt(
      id_number ? id_number : nick!,
    );

    let encryptedIdNumber: string | null = null;
    if (id_number) {
      const idKey = this.generateRandomKey();
      const encryptedId = this.cryptoUtil.aesEncrypt(id_number, idKey);
      encryptedIdNumber = `${encryptedId}$${idKey}`;
    }

    let encryptedName: string | null = null;
    if (name) {
      const nameKey = this.generateRandomKey();
      const encryptedNameVal = this.cryptoUtil.aesEncrypt(name, nameKey);
      encryptedName = `${encryptedNameVal}$${nameKey}`;
    }

    let encryptedPassword: string;

    if (password === 'empty') {
      const emptyKey = this.generateRandomKey();
      const encryptedEmpty = this.cryptoUtil.aesEncrypt('empty', emptyKey);
      encryptedPassword = `${encryptedEmpty}$${emptyKey}`;
    } else {
      const passKey = this.generateRandomKey();
      const encryptedPass = this.cryptoUtil.aesEncrypt(password, passKey);
      encryptedPassword = `${encryptedPass}$${passKey}`;
    }

    const newUser = this.userRepository.create({
      nick: nick,
      uuid: crypto.randomUUID(),
      identifier: identifier,
      id_number: encryptedIdNumber,
      name: encryptedName,
      password: encryptedPassword,
      school: school,
      profession: profession,
      permission: 0,
      profession_main_subject: main_subject,
      last_login: new Date(),
      reg_date: regDate,
    });

    return this.userRepository.save(newUser);
  }

  // 传入 UUID 和未加密的身份证号与船政系统获取身份证数据并同步到数据库内
  async syncIdNumberInfo(
    uuid: string,
    id_number: string,
  ): Promise<{
    status: 'success' | 'failed';
    messages: string;
    info: { name: string; school: string; profession: string } | null;
  }> {
    if (!id_number || !uuid) throw new Error('Missing params.');

    try {
      const user = await this.findUserByUuid(uuid);
      if (!user) {
        return { status: 'failed', messages: '用户不存在', info: null };
      }

      const apiResponse = await verifyIdNumber(id_number);

      if (apiResponse?.data?.outmap?.err === '身份证错误！') {
        return { status: 'failed', messages: '身份证不合法', info: null };
      }

      if (apiResponse?.data?.outmap?.err !== 'success') {
        return {
          status: 'failed',
          messages: '身份证验证失败: ' + apiResponse.data.outmap.err,
          info: null,
        };
      }

      const userInfo = apiResponse.data.outmap.xs;

      const idKey = this.generateRandomKey();
      const encryptedId = this.cryptoUtil.aesEncrypt(id_number, idKey);
      const encryptedIdNumber = `${encryptedId}$${idKey}`;

      const nameKey = this.generateRandomKey();
      const encryptedName = this.cryptoUtil.aesEncrypt(userInfo.xm, nameKey);
      const encryptedNameVal = `${encryptedName}$${nameKey}`;

      user.id_number = encryptedIdNumber;
      user.name = encryptedNameVal;
      user.school = userInfo.xx;
      user.profession = userInfo.zy;

      await this.userRepository.save(user);

      return {
        status: 'success',
        messages: '同步成功',
        info: {
          name: userInfo.xm,
          school: userInfo.xx,
          profession: userInfo.zy,
        },
      };
    } catch (error) {
      return {
        status: 'failed',
        messages: `同步失败: ${error.message}`,
        info: null,
      };
    }
  }

  // 通过 UUID 查找用户
  async findUserByUuid(uuid: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { uuid } });
  }

  // 根据身份证号和姓名查找用户
  async findByIdNumberAndName(
    id_number: string,
    name: string,
  ): Promise<User | null> {
    const hashedIdNumber = this.cryptoUtil.hashEncrypt(id_number);

    const user = await this.userRepository.findOne({
      where: { identifier: hashedIdNumber },
    });

    if (user) {
      const [encryptedName, keyName] = user.name.split('$');
      const decryptedName = this.cryptoUtil.aesDecrypt(encryptedName, keyName);

      if (decryptedName === name) {
        return user;
      }
    }

    const users = await this.userRepository.find();
    for (const user of users) {
      const [encryptedIdNumber, keyId] = user.id_number.split('$');
      const decryptedIdNumber = this.cryptoUtil.aesDecrypt(
        encryptedIdNumber,
        keyId,
      );

      const [encryptedName, keyName] = user.name.split('$');
      const decryptedName = this.cryptoUtil.aesDecrypt(encryptedName, keyName);

      if (decryptedIdNumber === id_number && decryptedName === name) {
        return user;
      }
    }

    return null;
  }

  // 通过昵称查询用户
  async findByNick(nick: string): Promise<User | null> {
    const identifier = this.cryptoUtil.hashEncrypt(nick);
    let user = await this.userRepository.findOne({ where: { identifier } });

    if (!user) {
      user = await this.userRepository.findOne({ where: { nick } });
    }

    return user;
  }

  // 更新用户密码
  async updatePassword(
    uuid: string,
    plaintextPassword: string,
  ): Promise<boolean> {
    const user = await this.findUserByUuid(uuid);
    if (!user) {
      return false;
    }

    let encryptedPassword;
    if (plaintextPassword === 'empty') {
      const key = this.generateRandomKey();
      const encryptedEmptyPassword = this.cryptoUtil.aesEncrypt('empty', key);
      encryptedPassword = `${encryptedEmptyPassword}$${key}`;
    } else {
      const key = this.generateRandomKey();
      const encryptedActualPassword = this.cryptoUtil.aesEncrypt(
        plaintextPassword,
        key,
      );
      encryptedPassword = `${encryptedActualPassword}$${key}`;
    }

    user.password = encryptedPassword;
    await this.userRepository.save(user);
    return true;
  }

  // 更新用户权限级别
  async updateUserPermission(
    uuid: string,
    permissionLevel: number,
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { uuid } });
    if (!user) {
      throw new Error('用户不存在');
    }

    user.permission = permissionLevel;
    return this.userRepository.save(user);
  }

  // 检查用户权限是否足够
  async checkUserPermission(
    uuid: string,
    requiredPermission: number,
  ): Promise<boolean> {
    const user = await this.findUserByUuid(uuid);
    if (!user) {
      throw new Error('用户不存在');
    }

    return user.permission >= requiredPermission;
  }

  // 返回用户设置模板
  async userSettingTemplate(uuid: string): Promise<{
    user_main_profession_subject: number;
    auto_sync_data: boolean;
    auto_save_progress: boolean;
    auto_star_question: boolean;
    show_user_stat: boolean;
    show_name: 'id_number' | 'nick';
  }> {
    const user = await this.userRepository.findOne({ where: { uuid: uuid } });

    const userMainProfessionSubject: number = user.profession_main_subject;

    return {
      user_main_profession_subject: userMainProfessionSubject, // 专业课科目
      auto_sync_data: true, // 自动同步数据
      auto_save_progress: true, // 自动更新进度
      auto_star_question: true, // 自动保存错题
      show_user_stat: true, // 允许向其他人展示做题进度
      show_name: 'id_number', // 对外展示的用户名称，可以为 'id_number' 或 'nick'
    };
  }
}

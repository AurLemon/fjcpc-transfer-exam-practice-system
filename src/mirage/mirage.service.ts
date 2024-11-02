// src/mirage/mirage.service

import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { Repository, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { User } from '../database/entities/user.entity';
import { Question } from '../database/entities/question.entity';
import { DoneQuestion } from '../database/entities/done_question.entity';
import { StarQuestion } from '../database/entities/star_question.entity';
import { UserSetting } from '../database/entities/user_setting.entity';
import { UserService } from '../user/user.service';
import { CryptoUtil } from '../common/crypto.util';
import * as fs from 'fs/promises';

/**
 * 用户数据接口，定义了 data.json 文件中用户数据的结构。
 */
interface UserData {
  questionDone: string[]; // 已完成的问题 ID 数组
  starQuestions: string[]; // 收藏的问题 ID 数组
  userInfo: {
    // 用户的基本信息
    xx: string;
    xm: string;
    sfz: string;
    zp: string;
    zy: string;
  };
  operateTime: {
    // 操作时间信息
    operateType: string;
    time: number; // 时间戳
  };
  userSettings: {
    // 用户设置
    publicStat: boolean; // 是否公开用户统计数据
  };
}

/**
 * MirageService 类用于处理用户数据文件并更新数据库。
 */
@Injectable()
export class MirageService {
  constructor(
    private readonly userService: UserService, // 用户服务
    private readonly cryptoUtil: CryptoUtil, // 加密工具
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(StarQuestion)
    private readonly starQuestionRepository: Repository<StarQuestion>,
    @InjectRepository(DoneQuestion)
    private readonly doneQuestionRepository: Repository<DoneQuestion>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(UserSetting)
    private readonly userSettingRepository: Repository<UserSetting>,
  ) {}

  /**
   * 处理用户数据文件并更新数据库的命令
   */
  @Command({
    command: 'process:mirage',
    describe: '从 JSON 文件中处理用户数据并更新数据库',
  })
  async processUsers() {
    try {
      // 读取并解析用户数据 JSON 文件
      const data = await fs.readFile('./src/mirage/data.json', 'utf8');
      const usersData = JSON.parse(data);

      // 遍历每个用户数据
      for (const [id_number, userData] of Object.entries(usersData) as [
        string,
        UserData,
      ][]) {
        const {
          questionDone,
          starQuestions,
          userInfo,
          operateTime,
          userSettings,
        } = userData;

        // 获取数据库中的所有用户
        const users = await this.userRepository.find();
        let existingUser: User | undefined;

        // 解密数据库中的身份证号，逐一比对
        for (const user of users) {
          const [encryptedIdNumber, key] = user.id_number.split('$');
          const decryptedIdNumber = this.cryptoUtil.aesDecrypt(
            encryptedIdNumber,
            key,
          );

          if (decryptedIdNumber === id_number) {
            existingUser = user;
            break;
          }
        }

        // 将秒级时间戳转换为 Date 对象
        const operateDate = new Date(operateTime.time * 1000);

        let userUuid: string;
        if (existingUser) {
          console.log(`用户 ${id_number} 已存在，使用现有记录。`);
          userUuid = existingUser.uuid;

          // 更新 last_login 和 reg_date 为 operateDate
          await this.userRepository.update(userUuid, {
            last_login: operateDate,
            reg_date: operateDate,
          });
        } else {
          // 创建新用户并设置主学科
          const newUser = await this.userService.createUser(
            id_number,
            userInfo.xm,
            'empty',
            userInfo.xx,
            userInfo.zy,
            1, // 设置 main_subject 为 1
          );
          userUuid = newUser.uuid;

          // 创建完成后，更新 last_login 和 reg_date 为 operateDate
          await this.userRepository.update(userUuid, {
            last_login: operateDate,
            reg_date: operateDate,
          });
        }

        // 更新用户设置（确保 userSettings 存在且包含 publicStat 属性）
        if (userSettings && typeof userSettings.publicStat === 'boolean') {
          await this.updateUserSettings(userUuid, userSettings);
        }

        // 保存收藏和完成的问题
        await this.saveStar(userUuid, starQuestions);
        await this.saveProgress(userUuid, questionDone);

        console.log(`用户 ${userInfo.xm} (${id_number}) 已处理。`);
      }
    } catch (error) {
      console.error('处理 JSON 文件时出错：', error);
    }
  }

  /**
   * 更新用户的设置
   * @param userUuid 用户的 UUID
   * @param userSettings 包含 publicStat 属性的用户设置对象
   */
  private async updateUserSettings(
    userUuid: string,
    userSettings: { publicStat: boolean },
  ) {
    const existingSettings = await this.userSettingRepository.findOne({
      where: { user: userUuid },
    });

    // 获取已有的设置或初始化空对象
    const settings = existingSettings ? existingSettings.setting : {};

    // 当 publicStat 为 false 时，设置 show_user_stat 为 false
    if (!userSettings.publicStat) {
      settings.show_user_stat = false;
    }

    if (existingSettings) {
      await this.userSettingRepository.update(userUuid, {
        setting: settings,
        last_modified: new Date(),
      });
    } else {
      await this.userSettingRepository.save({
        user: userUuid,
        setting: settings,
        last_modified: new Date(),
      });
    }
  }

  /**
   * 保存用户的收藏问题
   * @param userUuid 用户的 UUID
   * @param pid 收藏的问题 ID 数组
   * @param type 操作类型（默认为增加）
   */
  private async saveStar(userUuid: string, pid: string[], type?: string) {
    if (!pid.length) {
      return { status: 200, data: [] };
    }

    // 查询用户现有的收藏问题
    const existingStarQuestions = await this.starQuestionRepository.find({
      where: { user: userUuid, pid: In(pid) },
    });

    const existingPids = existingStarQuestions.map((question) => question.pid);

    if (type === 'delete') {
      await this.starQuestionRepository.delete({
        user: userUuid,
        pid: In(pid),
      });
      return { status: 200, message: '收藏的问题已成功删除' };
    }

    // 过滤出新的问题 ID
    const newPids = pid.filter(
      (pidNumber) => !existingPids.includes(pidNumber),
    );

    await Promise.all(
      newPids.map(async (pidNumber) => {
        const question = await this.questionRepository.findOne({
          where: { pid: pidNumber },
        });

        if (question) {
          await this.starQuestionRepository.save({
            user: userUuid,
            pid: question.pid,
            course: question.course,
            subject: question.subject,
            type: question.type,
            stared_time: Date.now(),
            folder: 'wrong',
          });

          await this.questionRepository.update(
            { pid: question.pid },
            { incorrect_count: () => 'incorrect_count + 1' },
          );
        } else {
          console.warn(`未找到 pid 为 ${pidNumber} 的问题。`);
        }
      }),
    );

    return { status: 200, message: '收藏的问题已成功保存' };
  }

  /**
   * 保存用户完成的问题
   * @param userUuid 用户的 UUID
   * @param pid 完成的问题 ID 数组
   * @param type 操作类型（默认为增加）
   */
  private async saveProgress(userUuid: string, pid: string[], type?: string) {
    if (!pid.length) {
      return { status: 200, data: [] };
    }

    // 查询用户现有的完成问题
    const existingDoneQuestions = await this.doneQuestionRepository.find({
      where: { user: userUuid, pid: In(pid) },
    });

    const existingPids = existingDoneQuestions.map((question) => question.pid);

    if (type === 'delete') {
      await this.doneQuestionRepository.delete({
        user: userUuid,
        pid: In(pid),
      });
      return { status: 200, message: '完成的问题已成功删除' };
    }

    // 过滤出新的问题 ID
    const newPids = pid.filter(
      (pidNumber) => !existingPids.includes(pidNumber),
    );

    await Promise.all(
      newPids.map(async (pidNumber) => {
        const question = await this.questionRepository.findOne({
          where: { pid: pidNumber },
        });

        if (question) {
          await this.doneQuestionRepository.save({
            user: userUuid,
            pid: question.pid,
            course: question.course,
            subject: question.subject,
            type: question.type,
            done_time: Date.now(),
          });

          await this.questionRepository.update(
            { pid: question.pid },
            { done_count: () => 'done_count + 1' },
          );
        } else {
          console.warn(`未找到 pid 为 ${pidNumber} 的问题。`);
        }
      }),
    );

    return { status: 200, message: '完成的问题已成功保存' };
  }
}

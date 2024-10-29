// src/user/user.controller.ts

import { Controller, Get, Post, Req, UseGuards, Body } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Request } from 'express';

import { ApiResponseUtil } from '../common/api.response';
import { UserService } from './user.service';
import { TokenService } from '../auth/token.service';
import { CryptoUtil } from '../common/crypto.util';
import { TokenGuard } from '../auth/token.guard';

import { User } from '../database/entities/user.entity';
import { UserSetting } from '../database/entities/user_setting.entity';
import { DoneQuestion } from '../database/entities/done_question.entity';
import { StarQuestion } from '../database/entities/star_question.entity';
import { Question } from '../database/entities/question.entity';
import { RequestInfo } from '../database/entities/request_info.entity';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly cryptoUtil: CryptoUtil,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSetting)
    private readonly userSettingRepository: Repository<UserSetting>,
    @InjectRepository(DoneQuestion)
    private readonly doneQuestionRepository: Repository<DoneQuestion>,
    @InjectRepository(StarQuestion)
    private readonly starQuestionRepository: Repository<StarQuestion>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(RequestInfo)
    private readonly requestInfoRepository: Repository<RequestInfo>,
  ) {}

  @UseGuards(TokenGuard)
  @Get('profile')
  async userProfile(@Req() req: Request) {
    const userInfo: any = req.user;

    const modifiedName =
      userInfo.name.length > 1
        ? userInfo.name[0] + '*'.repeat(userInfo.name.length - 1)
        : userInfo.name;

    const modifiedIdNumber =
      userInfo.id_number.substring(0, 6) +
      '***********' +
      userInfo.id_number.substring(17);

    const modifiedLastLogin = new Date(userInfo.last_login).getTime();
    const modifiedRegDate = new Date(userInfo.reg_date).getTime();

    const modifiedUserInfo = {
      ...userInfo,
      name: modifiedName,
      id_number: modifiedIdNumber,
      last_login: modifiedLastLogin,
      reg_date: modifiedRegDate,
    };

    const culturalCourseCount = await this.doneQuestionRepository.count({
      where: {
        user: userInfo.uuid,
        course: 1,
      },
    });

    let professionCourseCount = 0;

    professionCourseCount = await this.doneQuestionRepository.count({
      where: {
        user: userInfo.uuid,
        course: 2,
        subject: userInfo.profession_main_subject,
      },
    });

    const culturalTotal = await this.questionRepository.count({
      where: {
        course: 1,
      },
    });

    const professionTotal = await this.questionRepository.count({
      where: {
        course: 2,
        subject: userInfo.profession_main_subject,
      },
    });

    const userProgress = {
      current: culturalCourseCount + professionCourseCount,
      total: culturalTotal + professionTotal,
    };

    return ApiResponseUtil.success(200, {
      ...modifiedUserInfo,
      user_progress: userProgress,
    });
  }

  @UseGuards(TokenGuard)
  @Get('progress')
  async getProgress(@Req() req: Request) {
    const userInfo: any = req.user;
    const userUuid = userInfo.uuid;

    const doneQuestions = await this.doneQuestionRepository.find({
      where: { user: userUuid },
    });

    if (!doneQuestions.length) {
      return ApiResponseUtil.success(200, []);
    }

    const progressData = doneQuestions.map((question) => ({
      pid: question.pid,
      course: question.course,
      subject: question.subject,
      type: question.type,
      time: question.done_time,
    }));

    return ApiResponseUtil.success(200, progressData);
  }

  @UseGuards(TokenGuard)
  @Post('progress')
  async saveProgress(
    @Req() req: Request,
    @Body() body: { pid: string[]; type?: string },
  ) {
    const userInfo: any = req.user;
    const userUuid = userInfo.uuid;
    const { pid, type } = body;

    if (!pid.length) {
      return ApiResponseUtil.success(200, []);
    }

    const existingDoneQuestions = await this.doneQuestionRepository.find({
      where: { user: userUuid, pid: In(pid) },
    });

    const existingPids = existingDoneQuestions.map((question) => question.pid);

    if (type === 'delete') {
      await this.doneQuestionRepository.delete({
        user: userUuid,
        pid: In(pid),
      });

      return ApiResponseUtil.success(200, 'Progress deleted successfully');
    }

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
        }

        await this.questionRepository.update(
          { pid: question.pid },
          { done_count: () => 'done_count + 1' },
        );
      }),
    );

    return ApiResponseUtil.success(200, 'Progress saved successfully');
  }

  @UseGuards(TokenGuard)
  @Get('star')
  async getStar(@Req() req: Request) {
    const userInfo: any = req.user;
    const userUuid = userInfo.uuid;

    const starQuestions = await this.starQuestionRepository.find({
      where: { user: userUuid },
    });

    if (!starQuestions.length) {
      return ApiResponseUtil.success(200, []);
    }

    const starData = starQuestions.map((question) => ({
      pid: question.pid,
      course: question.course,
      subject: question.subject,
      type: question.type,
      time: question.stared_time,
    }));

    return ApiResponseUtil.success(200, starData);
  }

  @UseGuards(TokenGuard)
  @Post('star')
  async saveStar(
    @Req() req: Request,
    @Body() body: { pid: string[]; type?: string },
  ) {
    const userInfo: any = req.user;
    const userUuid = userInfo.uuid;
    const { pid, type } = body;

    if (!pid.length) {
      return ApiResponseUtil.success(200, []);
    }

    const existingStarQuestions = await this.starQuestionRepository.find({
      where: { user: userUuid, pid: In(pid) },
    });

    const existingPids = existingStarQuestions.map((question) => question.pid);

    if (type === 'delete') {
      await this.starQuestionRepository.delete({
        user: userUuid,
        pid: In(pid),
      });

      return ApiResponseUtil.success(
        200,
        'Starred questions deleted successfully',
      );
    }

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
        }
      }),
    );

    return ApiResponseUtil.success(200, 'Starred questions saved successfully');
  }

  @UseGuards(TokenGuard)
  @Get('setting')
  async getSetting(@Req() req: Request) {
    const userInfo: any = req.user;
    const userUuid = userInfo.uuid;

    const userSettingTemplate =
      await this.userService.userSettingTemplate(userUuid);

    const userUniqueSetting = await this.userSettingRepository.findOne({
      where: { user: userUuid },
    });

    if (userUniqueSetting) {
      Object.keys(userUniqueSetting).forEach((key) => {
        if (key in userSettingTemplate) {
          userSettingTemplate[key] = userUniqueSetting[key];
        }
      });
    }

    return ApiResponseUtil.success(200, userSettingTemplate);
  }

  @UseGuards(TokenGuard)
  @Post('setting')
  async saveSetting(@Req() req: Request, @Body() body: object) {
    const userInfo: any = req.user;
    const userUuid = userInfo.uuid;

    const userSettingTemplate =
      await this.userService.userSettingTemplate(userUuid);
    const existingSetting = await this.userSettingRepository.findOne({
      where: { user: userUuid },
    });

    const mergedSettings = { ...(existingSetting?.setting || {}), ...body };

    const updatedSettings = {};
    Object.keys(mergedSettings).forEach((key) => {
      if (
        key in userSettingTemplate &&
        mergedSettings[key] !== userSettingTemplate[key]
      ) {
        updatedSettings[key] = mergedSettings[key];
      }
    });

    if (Object.keys(updatedSettings).length === 0) {
      if (existingSetting) {
        await this.userSettingRepository.remove(existingSetting);
      }
    } else {
      await this.userSettingRepository.save({
        user: userUuid,
        setting: updatedSettings,
        last_modified: new Date(),
      });
    }

    return ApiResponseUtil.success(200, 'User setting saved successfully');
  }

  @Get('stat')
  async getStat() {
    const users = await this.userRepository.find();
    const userStats = [];

    for (const user of users) {
      const userUuid = user.uuid;

      const userSetting = await this.userSettingRepository.findOne({
        where: { user: userUuid },
      });
      const showUserStat = userSetting?.setting?.show_user_stat !== false;

      let decryptedName = null;
      let modifiedName = null;

      if (showUserStat) {
        const [encryptedName, nameKey] = user.name.split('$');
        decryptedName = this.cryptoUtil.aesDecrypt(encryptedName, nameKey);
        modifiedName =
          decryptedName.length > 1
            ? decryptedName[0] + '*'.repeat(decryptedName.length - 1)
            : decryptedName;
      }

      const doneQuestionsCount = await this.doneQuestionRepository.count({
        where: { user: userUuid },
      });

      const mainProfessionSubject = user.profession_main_subject;
      const totalCourse2SubjectCount = await this.questionRepository.count({
        where: { course: 2, subject: mainProfessionSubject },
      });
      const totalCourse1Count = await this.questionRepository.count({
        where: { course: 1 },
      });
      const totalQuestionsCount = totalCourse2SubjectCount + totalCourse1Count;

      const starQuestionsCount = await this.starQuestionRepository.count({
        where: { user: userUuid, folder: 'wrong' },
      });

      userStats.push({
        uuid: user.uuid,
        name: showUserStat ? modifiedName : null,
        profession: showUserStat ? user.profession : null,
        school: showUserStat ? user.school : null,
        last_login: new Date(user.last_login).getTime(),
        reg_date: new Date(user.reg_date).getTime(),
        main_profession_subject: showUserStat
          ? user.profession_main_subject
          : null,
        user_progress: {
          current: doneQuestionsCount,
          total: totalQuestionsCount,
        },
        wrong_count: starQuestionsCount,
      });
    }

    const userCount = await this.userRepository.count();
    const professionSubjects = await this.requestInfoRepository
      .createQueryBuilder('requestInfo')
      .select('subject')
      .where('course = :course', { course: 2 })
      .distinct(true)
      .getRawMany();
    const professionCount = professionSubjects.length;

    return ApiResponseUtil.success(200, {
      user_stat: userStats,
      overview: {
        user_count: userCount,
        profession_count: professionCount,
      },
    });
  }
}

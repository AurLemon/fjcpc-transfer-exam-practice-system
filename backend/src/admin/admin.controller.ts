import {
  Controller,
  Body,
  Get,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { TokenService } from '../auth/token.service';
import { CryptoUtil } from '../common/crypto.util';
import { ApiResponseUtil } from '../common/api.response';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestInfo } from '../database/entities/request_info.entity';
import { RequestLog } from '../database/entities/request_log.entity';
import { QuestionService } from '../question/question.service';
import config from '../config/config';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly tokenService: TokenService,
    private readonly cryptoUtil: CryptoUtil,
    private readonly questionService: QuestionService,
    @InjectRepository(RequestInfo)
    private readonly requestInfoRepository: Repository<RequestInfo>,
    @InjectRepository(RequestLog)
    private requestLogRepository: Repository<RequestLog>,
  ) {}

  @Get('percheck')
  async adminAction(@Req() req: Request) {
    const access_token = req.headers['authorization']?.split(' ')[1];
    if (!access_token) {
      return ApiResponseUtil.error(400, 'lack_token', '请传入 Token');
    }

    try {
      const permission =
        await this.tokenService.getPermissionFromToken(access_token);

      if (permission < 10) {
        return ApiResponseUtil.error(403, 'permission_denied', '权限不足');
      }

      return ApiResponseUtil.success(200, {
        message: '您有权限执行此操作',
      });
    } catch (err) {
      return ApiResponseUtil.error(500, 'unexpected_error', err.message);
    }
  }

  @Post('request')
  async requestChange(@Req() req: Request, @Body() body: any) {
    const access_token = req.headers['authorization']?.split(' ')[1];
    if (!access_token) {
      return ApiResponseUtil.error(400, 'lack_token', '请传入 Token');
    }

    try {
      const permission =
        await this.tokenService.getPermissionFromToken(access_token);

      if (permission < 10) {
        return ApiResponseUtil.error(403, 'permission_denied', '权限不足');
      }

      const {
        request_type,
        course,
        subject,
        profession_id,
        profession_name,
        id_number,
      } = body;

      if (!request_type || course === undefined) {
        return ApiResponseUtil.error(
          400,
          'invalid_params',
          '请提供完整的请求参数',
        );
      }

      if (course === 2 && (!profession_id || !profession_name)) {
        return ApiResponseUtil.error(
          400,
          'invalid_params',
          '专业课需要提供 profession_id 和 profession_name',
        );
      }

      if (subject < 0) {
        return ApiResponseUtil.error(
          400,
          'invalid_params',
          'subject 值的范围不能小于 0（不含）',
        );
      }

      let base64IdNumber: string | null = null;
      if (id_number) {
        try {
          const decryptedIdNumber =
            await this.cryptoUtil.decryptWithSM2(id_number);
          base64IdNumber = Buffer.from(decryptedIdNumber).toString('base64');
        } catch (err) {
          return ApiResponseUtil.error(
            500,
            'id_decrypt_failed',
            '身份证解密失败',
          );
        }
      }

      if (request_type === 'add') {
        const existingRequest = await this.requestInfoRepository.findOne({
          where: { course, subject },
        });

        if (existingRequest) {
          return ApiResponseUtil.error(
            400,
            'duplicate',
            '相同的 course 和 subject 已存在',
          );
        }

        const newRequestInfo = this.requestInfoRepository.create({
          course,
          subject: course === 2 ? subject : null,
          profession_id: course === 2 ? profession_id : null,
          profession_name: course === 2 ? profession_name : null,
          id_number: base64IdNumber,
        });

        await this.requestInfoRepository.save(newRequestInfo);
        return ApiResponseUtil.success(200, { status: '新增成功' });
      } else if (request_type === 'modify') {
        const requestInfo = await this.requestInfoRepository.findOne({
          where: { course, subject },
        });
        if (!requestInfo) {
          return ApiResponseUtil.error(404, 'not_found', '未找到相关记录');
        }

        if (id_number) {
          requestInfo.id_number = base64IdNumber;
        }

        if (profession_name) {
          requestInfo.profession_name = profession_name;
        }

        await this.requestInfoRepository.save(requestInfo);
        return ApiResponseUtil.success(200, { status: '修改成功' });
      } else if (request_type === 'delete') {
        const deleteResult = await this.requestInfoRepository.delete({
          course,
          subject,
        });
        if (deleteResult.affected === 0) {
          return ApiResponseUtil.error(404, 'not_found', '未找到相关记录');
        }

        return ApiResponseUtil.success(200, { status: '删除成功' });
      }

      return ApiResponseUtil.error(
        400,
        'invalid_request_type',
        '无效的 request_type',
      );
    } catch (err) {
      return ApiResponseUtil.error(500, 'unexpected_error', err.message);
    }
  }

  @Post('crawl')
  async crawlQuestionManually(@Req() req: Request, @Body() body: any) {
    const access_token = req.headers['authorization']?.split(' ')[1];
    if (!access_token) {
      return ApiResponseUtil.error(400, 'lack_token', '请传入 Token');
    }

    try {
      const permission =
        await this.tokenService.getPermissionFromToken(access_token);
      if (permission < 10) {
        return ApiResponseUtil.error(403, 'permission_denied', '权限不足');
      }

      const { course, subject, times } = body;

      if (course !== 1 && course !== 2) {
        return ApiResponseUtil.error(
          400,
          'invalid_course_or_subject',
          '无效的课程或科目',
        );
      }

      const requestInfo = await this.requestInfoRepository.findOne({
        where: { course, subject },
      });

      if (!requestInfo) {
        return ApiResponseUtil.error(
          404,
          'request_info_not_found',
          '未找到对应的请求信息',
        );
      }

      const decodedIdNumber = Buffer.from(
        requestInfo.id_number,
        'base64',
      ).toString();

      const requestTimesPerRound = parseInt(
        times || config().database.requestTimesPerRound,
        10,
      );

      const startTime = Date.now();

      let isParseSuccess = true;
      for (let i = 0; i < requestTimesPerRound; i++) {
        const parseResult = await this.questionService.processQuestions(
          course,
          decodedIdNumber,
        );

        if (!parseResult) {
          isParseSuccess = false;
        }
      }

      const endTime = Date.now();
      const elapsedTime = endTime - startTime;

      const requestLog = this.requestLogRepository.create({
        round: requestTimesPerRound,
        consuming: new Date(),
        course: course,
        subject: subject || 1,
        used_id_number: requestInfo.id_number,
        is_parse: isParseSuccess,
      });

      await this.requestLogRepository.save(requestLog);

      return ApiResponseUtil.success(200, {
        crawl_time: requestTimesPerRound,
        elapsed_time: elapsedTime,
        request_time: requestTimesPerRound,
        is_parse_success: isParseSuccess,
      });
    } catch (err) {
      return ApiResponseUtil.error(500, 'unexpected_error', err.message);
    }
  }
}

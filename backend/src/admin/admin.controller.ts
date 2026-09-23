import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { ApiResponseUtil } from '../common/api.response';
import { CryptoUtil } from '../common/crypto.util';
import config, {
  isRegistrationEnabled,
  setRegistrationEnabled,
} from '../config/config';
import { RequestInfo } from '../database/entities/request_info.entity';
import { RequestLog } from '../database/entities/request_log.entity';
import { User } from '../database/entities/user.entity';
import { QuestionService } from '../question/question.service';
import { TokenService } from '../auth/token.service';
import { UserService } from '../user/user.service';

interface CrawlJob {
  id: string;
  status: 'queued' | 'running' | 'success' | 'failed';
  course: number;
  subject: number;
  times: number;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  result?: Record<string, unknown>;
  error?: string;
}

const crawlJobs = new Map<string, CrawlJob>();

@Controller('admin')
export class AdminController {
  constructor(
    private readonly tokenService: TokenService,
    private readonly cryptoUtil: CryptoUtil,
    private readonly questionService: QuestionService,
    private readonly userService: UserService,
    @InjectRepository(RequestInfo)
    private readonly requestInfoRepository: Repository<RequestInfo>,
    @InjectRepository(RequestLog)
    private readonly requestLogRepository: Repository<RequestLog>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  private async requireAdmin(req: Request): Promise<boolean> {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return false;
    try {
      return (await this.tokenService.getPermissionFromToken(token)) >= 10;
    } catch {
      return false;
    }
  }

  private decrypt(value: string | null): string | null {
    if (!value) return null;
    const [encrypted, key] = value.split('$');
    try {
      return encrypted && key
        ? this.cryptoUtil.aesDecrypt(encrypted, key)
        : null;
    } catch {
      return null;
    }
  }

  private serializeUser(user: User, includeIdNumber = false) {
    const name = this.decrypt(user.name);
    return {
      uuid: user.uuid,
      nick: user.nick,
      ...(includeIdNumber ? { id_number: this.decrypt(user.id_number) } : {}),
      name: name
        ? `${name[0]}${'*'.repeat(Math.max(name.length - 1, 0))}`
        : null,
      school: user.school,
      profession: user.profession,
      profession_main_subject: user.profession_main_subject,
      permission: user.permission,
      last_login: user.last_login,
      reg_date: user.reg_date,
    };
  }

  @Get('percheck')
  async percheck(@Req() req: Request) {
    return (await this.requireAdmin(req))
      ? ApiResponseUtil.success(200, { message: '您有权限执行此操作' })
      : ApiResponseUtil.error(403, 'permission_denied', '权限不足');
  }

  @Get('registration')
  async getRegistration(@Req() req: Request) {
    return (await this.requireAdmin(req))
      ? ApiResponseUtil.success(200, { enabled: isRegistrationEnabled() })
      : ApiResponseUtil.error(403, 'permission_denied', '权限不足');
  }

  @Put('registration')
  async updateRegistration(
    @Req() req: Request,
    @Body() body: { enabled?: boolean },
  ) {
    if (!(await this.requireAdmin(req)))
      return ApiResponseUtil.error(403, 'permission_denied', '权限不足');
    if (typeof body.enabled !== 'boolean')
      return ApiResponseUtil.error(
        400,
        'invalid_params',
        'enabled 必须是 boolean',
      );
    return ApiResponseUtil.success(200, {
      enabled: setRegistrationEnabled(body.enabled),
    });
  }

  @Get('subjects')
  async listSubjects(@Req() req: Request) {
    if (!(await this.requireAdmin(req)))
      return ApiResponseUtil.error(403, 'permission_denied', '权限不足');
    const rows = await this.requestInfoRepository.find({
      where: { course: 2 },
      order: { subject: 'ASC' },
    });
    return ApiResponseUtil.success(
      200,
      rows.map(({ id_number, ...row }) => row),
    );
  }

  @Post('subjects')
  async createSubject(@Req() req: Request, @Body() body: any) {
    if (!(await this.requireAdmin(req)))
      return ApiResponseUtil.error(403, 'permission_denied', '权限不足');
    if (
      body.subject === undefined ||
      !body.profession_id ||
      !body.profession_name ||
      !body.id_number
    )
      return ApiResponseUtil.error(
        400,
        'invalid_params',
        '请提供完整的专业课参数',
      );
    if (
      await this.requestInfoRepository.findOne({
        where: { course: 2, subject: body.subject },
      })
    )
      return ApiResponseUtil.error(409, 'duplicate', '该专业课科目已存在');
    const row = this.requestInfoRepository.create({
      course: 2,
      subject: Number(body.subject),
      profession_id: body.profession_id,
      profession_name: body.profession_name,
      id_number: Buffer.from(body.id_number).toString('base64'),
    });
    const saved = await this.requestInfoRepository.save(row);
    return ApiResponseUtil.success(201, {
      request_uuid: saved.request_uuid,
      subject: saved.subject,
      profession_id: saved.profession_id,
      profession_name: saved.profession_name,
    });
  }

  @Put('subjects/:id')
  async updateSubject(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    if (!(await this.requireAdmin(req)))
      return ApiResponseUtil.error(403, 'permission_denied', '权限不足');
    const row = await this.requestInfoRepository.findOne({
      where: { request_uuid: id, course: 2 },
    });
    if (!row) return ApiResponseUtil.error(404, 'not_found', '专业课不存在');
    Object.assign(row, {
      subject: body.subject ?? row.subject,
      profession_id: body.profession_id ?? row.profession_id,
      profession_name: body.profession_name ?? row.profession_name,
      id_number: body.id_number
        ? Buffer.from(body.id_number).toString('base64')
        : row.id_number,
    });
    const saved = await this.requestInfoRepository.save(row);
    return ApiResponseUtil.success(200, {
      request_uuid: saved.request_uuid,
      subject: saved.subject,
      profession_id: saved.profession_id,
      profession_name: saved.profession_name,
    });
  }

  @Delete('subjects/:id')
  async deleteSubject(@Req() req: Request, @Param('id') id: string) {
    if (!(await this.requireAdmin(req)))
      return ApiResponseUtil.error(403, 'permission_denied', '权限不足');
    const result = await this.requestInfoRepository.delete({
      request_uuid: id,
      course: 2,
    });
    return result.affected
      ? ApiResponseUtil.success(200, { deleted: true })
      : ApiResponseUtil.error(404, 'not_found', '专业课不存在');
  }

  @Get('users')
  async listUsers(@Req() req: Request) {
    if (!(await this.requireAdmin(req)))
      return ApiResponseUtil.error(403, 'permission_denied', '权限不足');
    return ApiResponseUtil.success(
      200,
      (await this.userService.listUsers()).map((user) =>
        this.serializeUser(user),
      ),
    );
  }

  @Get('users/:id')
  async getUser(@Req() req: Request, @Param('id') id: string) {
    if (!(await this.requireAdmin(req)))
      return ApiResponseUtil.error(403, 'permission_denied', '权限不足');
    const user = await this.userService.findUserByUuid(id);
    return user
      ? ApiResponseUtil.success(200, this.serializeUser(user, true))
      : ApiResponseUtil.error(404, 'not_found', '用户不存在');
  }

  @Post('users')
  async createUser(@Req() req: Request, @Body() body: any) {
    if (!(await this.requireAdmin(req)))
      return ApiResponseUtil.error(403, 'permission_denied', '权限不足');
    if (!body.nick?.trim())
      return ApiResponseUtil.error(400, 'invalid_params', '昵称不能为空');
    if (await this.userService.findByNick(body.nick.trim()))
      return ApiResponseUtil.error(409, 'duplicate', '昵称已存在');
    const password = body.password || 'empty';
    if (password !== 'empty' && !/^\d{6}$/.test(password))
      return ApiResponseUtil.error(
        400,
        'password_illegal',
        '密码必须是六位数字或 empty',
      );
    const user = await this.userService.createUser(
      null,
      body.nick.trim(),
      null,
      password,
      null,
      null,
      1,
    );
    if (body.permission !== undefined)
      await this.userService.updateUserPermission(
        user.uuid,
        Number(body.permission),
      );
    return ApiResponseUtil.success(
      201,
      this.serializeUser({
        ...user,
        permission: Number(body.permission || 0),
      } as User),
    );
  }

  @Put('users/:id')
  async updateUser(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    if (!(await this.requireAdmin(req)))
      return ApiResponseUtil.error(403, 'permission_denied', '权限不足');
    if (
      body.password !== undefined &&
      body.password !== 'empty' &&
      !/^\d{6}$/.test(body.password)
    )
      return ApiResponseUtil.error(
        400,
        'password_illegal',
        '密码必须是六位数字或 empty',
      );
    try {
      return ApiResponseUtil.success(
        200,
        this.serializeUser(await this.userService.updateUser(id, body)),
      );
    } catch (error) {
      return ApiResponseUtil.error(
        404,
        'update_failed',
        error instanceof Error ? error.message : '用户更新失败',
      );
    }
  }

  @Delete('users/:id')
  async deleteUser(@Req() req: Request, @Param('id') id: string) {
    if (!(await this.requireAdmin(req)))
      return ApiResponseUtil.error(403, 'permission_denied', '权限不足');
    return (await this.userService.deleteUser(id))
      ? ApiResponseUtil.success(200, { deleted: true })
      : ApiResponseUtil.error(404, 'not_found', '用户不存在');
  }

  @Post('crawl/jobs')
  async createCrawlJob(@Req() req: Request, @Body() body: any) {
    if (!(await this.requireAdmin(req)))
      return ApiResponseUtil.error(403, 'permission_denied', '权限不足');
    if (
      ![1, 2].includes(Number(body.course)) ||
      (Number(body.course) === 2 && body.subject === undefined)
    )
      return ApiResponseUtil.error(400, 'invalid_params', '课程或科目无效');
    const row = await this.requestInfoRepository.findOne({
      where: { course: Number(body.course), subject: body.subject ?? null },
    });
    if (!row)
      return ApiResponseUtil.error(
        404,
        'request_info_not_found',
        '未找到对应的请求信息',
      );
    const job: CrawlJob = {
      id: crypto.randomUUID(),
      status: 'queued',
      course: Number(body.course),
      subject: Number(body.subject || 1),
      times: Number(body.times || config().database.requestTimesPerRound),
      created_at: new Date().toISOString(),
    };
    crawlJobs.set(job.id, job);
    void this.runCrawlJob(job, row.id_number);
    return ApiResponseUtil.success(202, job);
  }

  @Get('crawl/jobs')
  async listCrawlJobs(@Req() req: Request) {
    if (!(await this.requireAdmin(req)))
      return ApiResponseUtil.error(403, 'permission_denied', '权限不足');
    return ApiResponseUtil.success(
      200,
      Array.from(crawlJobs.values()).sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      ),
    );
  }

  @Get('crawl/jobs/:id')
  async getCrawlJob(@Req() req: Request, @Param('id') id: string) {
    if (!(await this.requireAdmin(req)))
      return ApiResponseUtil.error(403, 'permission_denied', '权限不足');
    const job = crawlJobs.get(id);
    return job
      ? ApiResponseUtil.success(200, job)
      : ApiResponseUtil.error(404, 'not_found', '任务不存在');
  }

  private async runCrawlJob(job: CrawlJob, encodedIdNumber: string) {
    job.status = 'running';
    job.started_at = new Date().toISOString();
    try {
      const start = Date.now();
      let success = true;
      const idNumber = Buffer.from(encodedIdNumber, 'base64').toString();
      for (let i = 0; i < job.times; i += 1)
        success =
          (await this.questionService.processQuestions(job.course, idNumber)) &&
          success;
      await this.requestLogRepository.save(
        this.requestLogRepository.create({
          round: job.times,
          consuming: new Date(),
          course: job.course,
          subject: job.subject,
          used_id_number: encodedIdNumber,
          is_parse: success,
        }),
      );
      job.status = 'success';
      job.result = {
        crawl_time: job.times,
        elapsed_time: Date.now() - start,
        is_parse_success: success,
      };
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : '爬取失败';
    } finally {
      job.finished_at = new Date().toISOString();
    }
  }
}

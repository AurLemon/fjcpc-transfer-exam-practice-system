import {
  Controller,
  Get,
  Query,
  Res,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from './export.service';
import { ApiResponseUtil } from '../common/api.response';

@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('questions')
  async exportQuestions(
    @Query('count') count: number = 10,
    @Query('course') course: number = 0,
    @Query('subject') subject: number = 0,
    @Query('includeImage') includeImage: boolean = true,
    @Query('questionType') questionType: number = -1,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.exportService.exportToWord(
        count,
        course,
        subject,
        includeImage,
        questionType,
      );

      // 构建文件名，包含筛选信息
      const timestamp = Date.now();
      const courseInfo = course > 0 ? `_c${course}` : '';
      const subjectInfo = subject > 0 ? `_s${subject}` : '';
      const imageInfo = !includeImage ? '_noimg' : '';
      const typeInfo = questionType >= 0 ? `_t${questionType}` : '';

      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="questions${courseInfo}${subjectInfo}${imageInfo}${typeInfo}_${timestamp}.docx"`,
        'Content-Length': buffer.length,
      });

      res.end(buffer);
    } catch (error) {
      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json(
          ApiResponseUtil.error(
            HttpStatus.INTERNAL_SERVER_ERROR,
            'export_failed',
            'Failed to export questions: ' + error.message,
          ),
        );
    }
  }

  @Get('config')
  async getExportConfig() {
    try {
      const config = await this.exportService.getCoursesAndSubjects();
      return ApiResponseUtil.success(HttpStatus.OK, config);
    } catch (error) {
      throw new HttpException(
        ApiResponseUtil.error(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'config_fetch_failed',
          'Failed to get export configuration: ' + error.message,
        ),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

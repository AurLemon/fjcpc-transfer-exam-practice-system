import { Controller, Get, Query, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from './export.service';

@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('questions')
  async exportQuestions(
    @Query('count') count: number = 10,
    @Query('course') course: number = 0,
    @Query('subject') subject: number = 0,
    @Query('includeImage') includeImage: boolean = true,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.exportService.exportToWord(
        count,
        course,
        subject,
        includeImage,
      );

      // 构建文件名，包含筛选信息
      const timestamp = Date.now();
      const courseInfo = course > 0 ? `_c${course}` : '';
      const subjectInfo = subject > 0 ? `_s${subject}` : '';
      const imageInfo = !includeImage ? '_noimg' : '';

      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="questions${courseInfo}${subjectInfo}${imageInfo}_${timestamp}.docx"`,
        'Content-Length': buffer.length,
      });

      res.end(buffer);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to export questions',
        error: error.message,
      });
    }
  }

  @Get('config')
  async getExportConfig(@Res() res: Response) {
    try {
      const config = await this.exportService.getCoursesAndSubjects();
      res.json(config);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to get export configuration',
        error: error.message,
      });
    }
  }
}

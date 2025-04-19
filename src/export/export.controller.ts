import { Controller, Get, Query, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from './export.service';

@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('questions')
  async exportQuestions(
    @Query('count') count: number = 10,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.exportService.exportToWord(count);

      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="questions_${Date.now()}.docx"`,
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
}

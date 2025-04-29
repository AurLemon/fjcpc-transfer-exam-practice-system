// src/question/question.controller

import { Controller, Get, Param, Query } from '@nestjs/common';
import { QuestionService } from './question.service';
import { ApiResponseUtil } from '../common/api.response';

@Controller('question')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Get('all')
  async getQuestions(
    @Query('course') course: number,
    @Query('subject') subject: number,
  ) {
    return ApiResponseUtil.success(
      200,
      await this.questionService.getQuestionsByCourseAndSubject(
        course,
        subject,
      ),
    );
  }

  @Get('practice')
  async getPractice(
    @Query('course') course: string,
    @Query('subject') subject: string,
    @Query('type') type: string = '-1',
    @Query('sort_column') sortColumn: string = 'pid',
    @Query('next_pid') queryNextPid?: string,
    @Query('prev_pid') queryPrevPid?: string,
    @Query('order') order: 'asc' | 'desc' = 'asc',
    @Query('index') index?: string,
  ) {
    const courseNumber = parseInt(course, 10);
    const subjectNumber = parseInt(subject, 10);
    const typeNumber = parseInt(type, 10);
    const startIndex = index ? parseInt(index, 10) : 0;
    const indexNumber = startIndex - 1 > 0 ? startIndex - 1 : 0;

    if (isNaN(courseNumber) || isNaN(subjectNumber)) {
      return ApiResponseUtil.error(
        400,
        'invalid_params',
        'course and subject must be numbers.',
      );
    }

    const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const { questions, nextPid, prevPid, stat, sequence } =
      await this.questionService.getPracticeQuestions(
        courseNumber,
        subjectNumber,
        typeNumber,
        sortColumn,
        sortOrder,
        queryNextPid,
        queryPrevPid,
        !queryNextPid && !queryPrevPid ? indexNumber : 0,
      );

    if (questions.length === 0) {
      return ApiResponseUtil.success(200, {
        questions: [],
        next_pid: null,
        prev_pid: null,
        stat,
        sequence: [],
      });
    }

    return ApiResponseUtil.success(200, {
      sequence,
      questions,
      next_pid: nextPid,
      prev_pid: prevPid,
      stat,
    });
  }

  @Get('test')
  async getTest() {
    /**
     * 以后有需要了再开发，先预留了
     */
    return ApiResponseUtil.error(404, 'still_developing', '别急');
  }

  @Get('info')
  async getStat() {
    return ApiResponseUtil.success(200, await this.questionService.getStat());
  }

  @Get('search')
  async searchQuestions(
    @Query('keyword') keyword: string,
    @Query('course') course: string = '-1',
    @Query('subject') subject: string = '-1',
    @Query('type') type: string = '-1',
    @Query('page') page: string = '1',
    @Query('page_size') pageSize: string = '10',
  ) {
    if (!keyword || keyword.trim() === '') {
      return ApiResponseUtil.error(
        400,
        'invalid_params',
        'Keyword is required.',
      );
    }

    const courseNumber = parseInt(course, 10);
    const subjectNumber = parseInt(subject, 10);
    const typeNumber = parseInt(type, 10);
    const pageNumber = parseInt(page, 10);
    const pageSizeNumber = parseInt(pageSize, 10);

    if (
      isNaN(courseNumber) ||
      isNaN(subjectNumber) ||
      isNaN(typeNumber) ||
      isNaN(pageNumber) ||
      isNaN(pageSizeNumber)
    ) {
      return ApiResponseUtil.error(
        400,
        'invalid_params',
        'Numeric parameters must be valid numbers.',
      );
    }

    const result = await this.questionService.searchQuestions(
      keyword,
      courseNumber,
      subjectNumber,
      typeNumber,
      pageNumber,
      pageSizeNumber,
    );

    return ApiResponseUtil.success(200, result);
  }

  @Get(':pid')
  async getQuestion(@Param('pid') pid: string) {
    return ApiResponseUtil.success(
      200,
      await this.questionService.getQuestionByPid(pid),
    );
  }
}

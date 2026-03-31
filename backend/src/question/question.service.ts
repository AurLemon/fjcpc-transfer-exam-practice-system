// src/question/question.service

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Brackets } from 'typeorm';
import { isEqual } from 'lodash';

import { Question } from '../database/entities/question.entity';
import { UpdatedQuestion } from '../database/entities/updated_question.entity';
import { RequestInfo } from '../database/entities/request_info.entity';

import { fetchExamQuestions } from '../api/api';
import config from '../config/config';

@Injectable()
export class QuestionService {
  constructor(
    @InjectRepository(Question)
    private questionsRepository: Repository<Question>,

    @InjectRepository(RequestInfo)
    private requestInfoRepository: Repository<RequestInfo>,

    @InjectRepository(UpdatedQuestion)
    private updatedQuestionRepository: Repository<UpdatedQuestion>,
  ) {}

  // 获取单个题目
  async getQuestionByPid(pid: string): Promise<Question> {
    return await this.questionsRepository.findOne({ where: { pid } });
  }

  // 根据课程和科目获取题目
  async getQuestionsByCourseAndSubject(
    course: number = 1,
    subject: number = 1,
  ): Promise<Question[]> {
    return await this.questionsRepository.find({
      where: { course, subject },
    });
  }

  // 处理题目
  async processQuestions(courseType: number, userId: string): Promise<boolean> {
    const rawData = await fetchExamQuestions(courseType, userId);

    if (!rawData || !rawData.list || !Array.isArray(rawData.list)) {
      return false;
    }

    const dtnameList = rawData.list;

    for (const dtname of dtnameList) {
      const dtlx = dtname.dtlx ? parseInt(dtname.dtlx, 10) : 0;

      if (!Array.isArray(dtname.xtlist)) {
        continue;
      }

      let subject = 0;
      if (courseType === 1) {
        if (dtname.dtname.includes('语文')) {
          subject = 1;
        } else if (dtname.dtname.includes('数学')) {
          subject = 2;
        } else if (dtname.dtname.includes('英语')) {
          subject = 3;
        } else if (dtname.dtname.includes('政治')) {
          subject = 4;
        }
      }

      for (const question of dtname.xtlist) {
        const existingQuestion = await this.questionsRepository.findOne({
          where: { pid: question.pid },
        });

        const parsedOptions = this.parseOptions(question.list);

        let parsedAnswer: string[] | string[][] = [];
        if (dtlx === 8 && Array.isArray(question.list)) {
          parsedAnswer = this.parseSubAnswers(question.list);
        } else if (question.zqda) {
          parsedAnswer = this.parseAnswer(question.zqda, question.list, false);
        }

        const hasSubOptions = dtlx === 8;
        const subOptions = hasSubOptions
          ? this.parseSubOptions(question.list)
          : null;

        if (courseType === 2) {
          const requestInfo = await this.requestInfoRepository.findOne({
            where: { course: courseType, subject: question.subject },
          });
          subject = requestInfo ? requestInfo.subject : 0;
        }

        const questionData = {
          unique_code: this.generateUniqueCode(),
          pid: question.pid,
          content: question.tg,
          type: dtlx,
          options: parsedOptions,
          sub_options: subOptions,
          answer: parsedAnswer,
          subject,
          course: courseType,
          created_time: this.parseTimestamp(question.tjsj),
          updated_time: this.parseTimestamp(question.xgsj),
          crawl_time: Date.now(),
          done_count: existingQuestion ? existingQuestion.done_count : 0,
          incorrect_count: existingQuestion
            ? existingQuestion.incorrect_count
            : 0,
          status: true,
          crawl_count: existingQuestion ? existingQuestion.crawl_count : 1,
        };

        if (existingQuestion) {
          if (this.isQuestionUpdated(existingQuestion, questionData)) {
            await this.questionsRepository.update(
              { pid: question.pid },
              questionData,
            );
          }
          await this.incrementCrawlCount(question.pid);
        } else {
          await this.questionsRepository.save(questionData);
        }
      }
    }

    return true;
  }

  // 解析选项，包含选项号和选项ID
  private parseOptions(optionList: any[]): any {
    if (optionList.some((option) => Array.isArray(option.list))) {
      return null;
    }

    return optionList.map((option) => ({
      id: option.id,
      xx: option.xx,
      txt: option.txt,
    }));
  }

  // 解析答案
  private parseAnswer(
    zqda: string,
    optionList: any[],
    hasSubOptions: boolean,
  ): string[] | string[][] {
    const answerIds = zqda.split(',').map((id) => id);

    if (hasSubOptions) {
      return answerIds.map((id) => [id]);
    }

    return answerIds;
  }

  // 解析子题目的答案
  private parseSubAnswers(subOptionList: any[]): string[][] {
    return subOptionList.map((subOption) => {
      if (subOption.da) {
        const answerId = subOption.da.toString();
        return [answerId];
      }
      return null;
    });
  }

  // 解析子选项
  private parseSubOptions(subOptionList: any[]): any {
    if (!Array.isArray(subOptionList)) {
      return null;
    }

    return subOptionList.map((subOption) => ({
      tg: subOption.tg,
      list: this.parseOptions(subOption.list),
    }));
  }

  // 生成唯一的题目编码
  private generateUniqueCode(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  // 解析时间戳
  private parseTimestamp(timeObj: any): number {
    return timeObj.time;
  }

  // 检查题目是否更新
  private async isQuestionUpdated(
    existing: Question,
    newData: Partial<Question>,
  ): Promise<boolean> {
    const isUpdated =
      !isEqual(existing.content, newData.content) ||
      !isEqual(
        JSON.stringify(existing.options),
        JSON.stringify(newData.options),
      ) ||
      !isEqual(existing.answer, newData.answer);

    if (isUpdated) {
      await this.saveUpdatedQuestion(existing);
    }

    return isUpdated;
  }

  // 保存更新的题目信息
  private async saveUpdatedQuestion(existingQuestion: Question): Promise<void> {
    const updatedQuestion = this.updatedQuestionRepository.create({
      pid: existingQuestion.pid,
      unique_code: existingQuestion.unique_code,
      type: existingQuestion.type,
      subject: existingQuestion.subject,
      course: existingQuestion.course,
      updated_time: Date.now(),
    });

    await this.updatedQuestionRepository.save(updatedQuestion);
  }

  // 增加爬取计数
  private async incrementCrawlCount(pid: string): Promise<void> {
    await this.questionsRepository.increment({ pid }, 'crawl_count', 1);
  }

  // 统计信息
  async getStat() {
    const getQuestionTypes = async (course: number, subject: number) => {
      const types = await this.questionsRepository
        .createQueryBuilder('question')
        .select('question.type')
        .where('question.course = :course', { course })
        .andWhere('question.subject = :subject', { subject })
        .groupBy('question.type')
        .getRawMany();

      const questionTypes = await Promise.all(
        types.map(async (typeData) => {
          const type = typeData.question_type;
          const count = await this.questionsRepository.count({
            where: { course, subject, type },
          });
          return { type, count };
        }),
      );

      return questionTypes;
    };

    const culturalLessonStat = [
      {
        subject: 1,
        id: 'chinese',
        name: '语文',
        count: await this.questionsRepository.count({
          where: { course: 1, subject: 1 },
        }),
        question_types: await getQuestionTypes(1, 1),
      },
      {
        subject: 2,
        id: 'math',
        name: '数学',
        count: await this.questionsRepository.count({
          where: { course: 1, subject: 2 },
        }),
        question_types: await getQuestionTypes(1, 2),
      },
      {
        subject: 3,
        id: 'english',
        name: '英语',
        count: await this.questionsRepository.count({
          where: { course: 1, subject: 3 },
        }),
        question_types: await getQuestionTypes(1, 3),
      },
      {
        subject: 4,
        id: 'politics',
        name: '政治',
        count: await this.questionsRepository.count({
          where: { course: 1, subject: 4 },
        }),
        question_types: await getQuestionTypes(1, 4),
      },
    ];

    const professionLessons = await this.requestInfoRepository.find({
      where: { course: 2 },
    });

    const professionLessonStat = [];

    for (const profession of professionLessons) {
      const professionId = profession.profession_id;
      const professionName = profession.profession_name;
      const subjectId = profession.subject;

      const count = await this.questionsRepository.count({
        where: { course: 2, subject: subjectId },
      });

      const questionTypes = await getQuestionTypes(2, subjectId);

      professionLessonStat.push({
        subject: subjectId,
        id: professionId,
        name: professionName,
        count: count,
        question_types: questionTypes,
      });
    }

    const examTime = config().exam_info.exam_time;
    const examTrust = config().exam_info.exam_trust;

    return {
      cultural_lesson: culturalLessonStat,
      profession_lesson: professionLessonStat,
      exam_info: {
        exam_time: examTime,
        exam_trust: examTrust,
      },
      git_info: {
        local_commit: config().git_info.local_commit,
        repo_commit: config().git_info.repo_commit,
        local_commit_time: config().git_info.local_commit_time,
        repo_commit_time: config().git_info.repo_commit_time,
        local_commit_message: config().git_info.local_commit_message,
        repo_commit_message: config().git_info.repo_commit_message,
        recent_commit: config().git_info.recent_commit,
      },
    };
  }

  // 刷题信息
  async getPracticeQuestions(
    course: number,
    subject: number,
    type: number = -1,
    sortColumn: string = 'pid',
    order: 'ASC' | 'DESC' = 'ASC',
    nextPagePid?: string,
    prevPagePid?: string,
    index: number = 0,
  ): Promise<{
    sequence: string[];
    questions: Question[];
    nextPid: string | null;
    prevPid: string | null;
    stat: any;
  }> {
    const pageSize = 10;

    const baseQueryBuilder = this.questionsRepository
      .createQueryBuilder('question')
      .select(['question.pid'])
      .where('question.course = :course', { course });

    if (subject !== -1) {
      baseQueryBuilder.andWhere('question.subject = :subject', { subject });
    }

    if (type !== -1) {
      baseQueryBuilder.andWhere('question.type = :type', { type });
    }

    sortColumn =
      sortColumn !== 'pid' && sortColumn !== 'crawl_count' ? 'pid' : sortColumn;

    const sequence = await baseQueryBuilder
      .orderBy(`question.${sortColumn}`, order)
      .getMany()
      .then((results) => results.map((item) => item.pid));

    const totalQuestions = sequence.length;
    let startIndex = 0;

    if (nextPagePid) {
      const currentIndex = sequence.indexOf(nextPagePid);
      if (currentIndex === -1) {
        return {
          sequence,
          questions: [],
          nextPid: null,
          prevPid: null,
          stat: {
            course,
            subject,
            type,
            order,
            sort_column: sortColumn,
            total_questions: totalQuestions,
          },
        };
      }
      startIndex = currentIndex + 1;
    } else if (prevPagePid) {
      const currentIndex = sequence.indexOf(prevPagePid);
      if (currentIndex === -1) {
        return {
          sequence,
          questions: [],
          nextPid: null,
          prevPid: null,
          stat: {
            course,
            subject,
            type,
            order,
            sort_column: sortColumn,
            total_questions: totalQuestions,
          },
        };
      }
      startIndex = currentIndex - pageSize;
      if (startIndex < 0) startIndex = 0;
    } else if (index > 0) {
      startIndex = index;
    }

    if (startIndex < 0) startIndex = 0;
    if (startIndex > totalQuestions) startIndex = totalQuestions;

    const pagePids = sequence.slice(startIndex, startIndex + pageSize);

    const questions = await this.questionsRepository.find({
      where: { pid: In(pagePids) },
    });

    const pidOrderMap = new Map(pagePids.map((pid, idx) => [pid, idx]));
    questions.sort((a, b) => {
      const indexA = pidOrderMap.get(a.pid) ?? 0;
      const indexB = pidOrderMap.get(b.pid) ?? 0;
      return indexA - indexB;
    });

    const lastPid = pagePids[pagePids.length - 1] || null;
    const firstPid = pagePids[0] || null;

    const nextPidValue =
      startIndex + pageSize < totalQuestions ? lastPid : null;
    const prevPidValue = startIndex > 0 ? firstPid : null;

    const questionsWithIndex = questions.map((question, i) => ({
      index: startIndex + i + 1,
      ...question,
    }));

    return {
      sequence,
      questions: questionsWithIndex,
      nextPid: nextPidValue,
      prevPid: prevPidValue,
      stat: {
        course,
        subject,
        type,
        order,
        sort_column: sortColumn,
        total_questions: totalQuestions,
      },
    };
  }

  async searchQuestions(
    keyword: string,
    course: number = -1,
    subject: number = -1,
    type: number = -1,
    page: number = 1,
    pageSize: number = 10,
  ): Promise<{
    questions: any[];
    total: number;
    page: number;
    page_size: number;
  }> {
    const escapedKeyword = keyword.replace(/[%_]/g, '\\$&');

    const queryBuilder = this.questionsRepository
      .createQueryBuilder('question')
      .where(
        new Brackets((qb) => {
          qb.where('question.content LIKE :keyword', {
            keyword: `%${escapedKeyword}%`,
          })
            .orWhere(
              `JSON_EXTRACT(question.options, '$[*].txt') LIKE :optionKeyword`,
              {
                optionKeyword: `%${escapedKeyword}%`,
              },
            )
            .orWhere(
              `JSON_EXTRACT(question.sub_options, '$[*].tg') LIKE :subOptionKeyword`,
              {
                subOptionKeyword: `%${escapedKeyword}%`,
              },
            )
            .orWhere(
              `JSON_EXTRACT(question.sub_options, '$[*].list[*].txt') LIKE :subOptionListKeyword`,
              {
                subOptionListKeyword: `%${escapedKeyword}%`,
              },
            );
        }),
      );

    if (course !== -1) {
      queryBuilder.andWhere('question.course = :course', { course });
    }

    if (subject !== -1) {
      queryBuilder.andWhere('question.subject = :subject', { subject });
    }

    if (type !== -1) {
      queryBuilder.andWhere('question.type = :type', { type });
    }

    const total = await queryBuilder.getCount();

    const questions = await queryBuilder
      .select([
        'question.pid',
        'question.content',
        'question.options',
        'question.sub_options',
        'question.course',
        'question.subject',
        'question.type',
      ])
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    const processedQuestions = questions.map((question) => {
      const summary = this.findAndExtractSummary(question, keyword);

      return {
        pid: question.pid,
        course: question.course,
        subject: question.subject,
        type: question.type,
        content_summary: summary,
      };
    });

    return {
      questions: processedQuestions,
      total,
      page,
      page_size: pageSize,
    };
  }

  // 在题目的所有部分中查找关键词并提取摘要
  private findAndExtractSummary(question: any, keyword: string): string {
    const contentSummary = this.extractContentSummary(
      question.content,
      keyword,
    );
    if (contentSummary.includes('<mark>')) {
      return contentSummary;
    }

    if (question.options && Array.isArray(question.options)) {
      for (const option of question.options) {
        if (
          option.txt &&
          option.txt.toLowerCase().includes(keyword.toLowerCase())
        ) {
          const optionText = this.extractContentSummary(option.txt, keyword);
          return `<span class="option-label">${option.xx || '选项'}:</span> ${optionText}`;
        }
      }
    }

    if (question.sub_options && Array.isArray(question.sub_options)) {
      for (let i = 0; i < question.sub_options.length; i++) {
        const subOption = question.sub_options[i];

        if (
          subOption.tg &&
          subOption.tg.toLowerCase().includes(keyword.toLowerCase())
        ) {
          const subContentSummary = this.extractContentSummary(
            subOption.tg,
            keyword,
          );
          return `<span class="sub-question-label">小题${i + 1}:</span> ${subContentSummary}`;
        }

        if (subOption.list && Array.isArray(subOption.list)) {
          for (const listItem of subOption.list) {
            if (
              listItem.txt &&
              listItem.txt.toLowerCase().includes(keyword.toLowerCase())
            ) {
              const optionSummary = this.extractContentSummary(
                listItem.txt,
                keyword,
              );
              return `<span class="sub-option-label">小题${i + 1}选项${listItem.xx || ''}:</span> ${optionSummary}`;
            }
          }
        }
      }
    }

    return contentSummary;
  }

  // 提取内容摘要并高亮关键词
  private extractContentSummary(content: string, keyword: string): string {
    const plainContent = content.replace(/<[^>]*>/g, '');

    const keywordIndex = plainContent
      .toLowerCase()
      .indexOf(keyword.toLowerCase());

    if (keywordIndex >= 0) {
      const summaryLength = 100;
      const startIndex = Math.max(0, keywordIndex - summaryLength / 2);
      const endIndex = Math.min(
        plainContent.length,
        keywordIndex + keyword.length + summaryLength / 2,
      );

      let summary = plainContent.substring(startIndex, endIndex);

      if (startIndex > 0) {
        summary = '...' + summary;
      }

      if (endIndex < plainContent.length) {
        summary = summary + '...';
      }

      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const highlightedSummary = summary.replace(
        new RegExp(escapedKeyword, 'gi'),
        (match) => `<mark>${match}</mark>`,
      );

      return highlightedSummary;
    }

    return (
      plainContent.substring(0, 100) + (plainContent.length > 100 ? '...' : '')
    );
  }
}

// src/question/question.module

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionController } from './question.controller';

import { Question } from '../database/entities/question.entity';
import { UpdatedQuestion } from '../database/entities/updated_question.entity';
import { RequestInfo } from '../database/entities/request_info.entity';

import { QuestionService } from './question.service';

@Module({
  imports: [TypeOrmModule.forFeature([Question, RequestInfo, UpdatedQuestion])],
  controllers: [QuestionController],
  providers: [QuestionService],
  exports: [QuestionService],
})
export class QuestionModule {}

// src/database/entities/done_question.entity

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('done_questions')
export class DoneQuestion {
  @PrimaryGeneratedColumn('uuid')
  uuid: string; // 每个做完题的信息的 UUID

  @Column('uuid')
  user: string; // 对应的用户 UUID（从 users 表的 uuid 获取）

  @Column({ type: 'varchar', length: 255 })
  pid: string; // 被用户做完的题目编号（从 questions 表获取）

  @Column('int')
  subject: number; // 被做完题目的 subject（从 questions 表获取）

  @Column('int')
  course: number; // 被做完题目的 course（从 questions 表获取）

  @Column('int')
  type: number; // 被做完题目的 type（从 questions 表获取）

  @Column('bigint')
  done_time: number; // 完成时间（timestamp）
}

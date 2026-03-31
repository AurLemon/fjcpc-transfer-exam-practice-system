// src/database/entities/star_question.entity

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('star_questions')
export class StarQuestion {
  @PrimaryGeneratedColumn('uuid')
  uuid: string; // 每个收藏信息的 UUID

  @Column('uuid')
  user: string; // 对应的用户 UUID（从 users 表的 uuid 获取）

  @Column({ type: 'varchar', length: 255 })
  pid: string; // 被用户收藏的题目编号（从 questions 表获取）

  @Column('int')
  subject: number; // 被收藏题目的 subject（从 questions 表获取）

  @Column('int')
  course: number; // 被收藏题目的 course（从 questions 表获取）

  @Column('int')
  type: number; // 被做完题目的 type（从 questions 表获取）

  @Column('bigint')
  stared_time: number; // 收藏时间（timestamp）

  @Column({ type: 'varchar', length: 255 })
  folder: string; // 题目收藏夹（默认 'wrong'，因为自定义收藏夹功能还没开发）
}

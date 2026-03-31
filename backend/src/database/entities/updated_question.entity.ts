// src/database/entities/updated_question.entity

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('updated_questions')
export class UpdatedQuestion {
  @PrimaryGeneratedColumn('uuid')
  uuid: string; // 生成的 UUID 主键

  @Column({ type: 'varchar', length: 255 })
  pid: string; // 被更新题目的题目编号

  @Column({ type: 'varchar', length: 255 })
  unique_code: string; // 被更新题目的唯一编号

  @Column('int')
  type: number; // 被更新题目的题目类型（源 API 的 dtlx 字段）

  @Column('int')
  subject: number; // 被更新题目的科目（根据 course 和 subject 字段映射）

  @Column('int')
  course: number; // 被更新题目属于哪个大类，文化课或专业课

  @Column('bigint')
  updated_time: number; // 被更新题目的更新时间
}

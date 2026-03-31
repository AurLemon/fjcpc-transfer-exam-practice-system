// src/database/entities/question.entity

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  unique_code: string; // 题目唯一编号

  @Column({ type: 'varchar', length: 255 })
  pid: string; // 源 API 中的题目编号

  @Column('text')
  content: string; // 题目内容（源 API 的 tg 字段）

  @Column('int')
  type: number; // 题目类型（源 API 的 dtlx 字段）

  @Column('json', { nullable: true })
  options: any; // 题目选项（源 API 的 list 数组）

  @Column('json', { nullable: true })
  sub_options: any; // 子题目选项（针对答案多次嵌套的，比如源 API 中 dtlx 为 8 的）

  @Column('json')
  answer: string[][] | string[]; // 正确答案（源 API 的 zqda 字段，解析后重构存入）

  @Column('int')
  subject: number; // 科目（根据 course 和 subject 字段映射）

  @Column('int')
  course: number; // 属于哪个大类，文化课或专业课

  @Column('bigint')
  created_time: number; // 题目创建时间（源 API 的 cjsj 转换为 timestamp）

  @Column('bigint')
  updated_time: number; // 题目更新时间（源 API 的 xgsj 转换为 timestamp）

  @Column('bigint')
  crawl_time: number; // 题目爬取时间

  @Column('int', { default: 0 })
  done_count: number; // 做过这题的用户人数

  @Column('int', { default: 0 })
  incorrect_count: number; // 做错过的用户人数

  @Column({ default: true })
  status: boolean; // 题目状态（true 为启用）

  @Column('int', { default: 1 })
  crawl_count: number; // 爬取计数
}

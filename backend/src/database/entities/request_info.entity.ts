// src/database/entities/request_info.entity

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('request_info')
export class RequestInfo {
  @PrimaryGeneratedColumn('uuid')
  request_uuid: string; // 生成的 UUID 主键

  @Column('int')
  course: number; // 课程类型（配合 subject 字段）

  @Column({ type: 'varchar', length: 512 })
  id_number: string; // 身份证号

  @Column({ type: 'varchar', length: 255, nullable: true })
  profession_id: string | null; // 专业课英文 ID

  @Column({ type: 'varchar', length: 255, nullable: true })
  profession_name: string | null; // 专业课名称

  @Column({ type: 'int', nullable: true })
  subject: number; // 科目类型（配合 course 字段）
}

// src/database/entities/request_log.entity

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('request_log')
export class RequestLog {
  @PrimaryGeneratedColumn('uuid')
  request_uuid: string; // 生成的 UUID 主键

  @Column('int')
  round: number; // 从属第几轮请求？（一轮会发送好几个请求）

  @Column({ type: 'timestamp' })
  consuming: Date; // 消耗时间

  @Column('int')
  course: number; // 课程类型（配合 subject 字段）

  @Column('int')
  subject: number; // 科目类型（配合 course 字段）

  @Column({ type: 'varchar', length: 512 })
  used_id_number: string; // 使用的身份证号，身份证号要从request_info表course、subject字段相同所对应的id_number字段获取，info表的id_number使用base64压缩过，记得还原回来再继续

  @Column({ default: false })
  is_parse: boolean; // 能否被解析，主要看返回体有没有数据，而且list里面有没有数据
}

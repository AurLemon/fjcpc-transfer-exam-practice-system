// src/database/entities/user_setting.entity

import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('user_settings')
export class UserSetting {
  @PrimaryColumn('uuid')
  user: string; // 用户 UUID

  @Column('json')
  setting: any; // 只存储用户修改过的设置

  @Column({ type: 'timestamp' })
  last_modified: Date; // 上次修改
}

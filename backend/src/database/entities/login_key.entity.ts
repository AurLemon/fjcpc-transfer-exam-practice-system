// src/database/entities/login_key.entity

import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
@Entity('login_key')
export class LoginKey {
  @PrimaryGeneratedColumn('uuid')
  uuid: string; // 生成的 UUID 主键

  @Column({ type: 'varchar', length: 500 })
  private_key: string; // 私钥

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  expiry_time: Date; // 过期时间（timestamp）
}

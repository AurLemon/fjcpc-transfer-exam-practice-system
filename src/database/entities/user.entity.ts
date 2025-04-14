import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  uuid: string; // 生成的 UUID 主键

  @Column({ type: 'varchar', length: 255 })
  nick: string; // 用户昵称

  @Column({ type: 'varchar', length: 255 })
  identifier: string; // 用于查找数据的唯一标识符

  @Column({ type: 'varchar', length: 255, nullable: true })
  id_number: string | null; // 身份证号

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null; // 真实姓名（AES）

  @Column({ type: 'varchar', length: 255 })
  password: string; // 登录密码（AES）

  @Column({ type: 'varchar', length: 100, nullable: true })
  school: string | null; // 学校

  @Column({ type: 'varchar', length: 100, nullable: true })
  profession: string | null; // 专业

  @Column({ type: 'int', default: -1 })
  profession_main_subject: number; // 主要专业科目编号

  @Column({ type: 'int', default: 0 })
  permission: number; // 权限

  @Column({ type: 'timestamp' })
  last_login: Date; // 上次登录

  @Column({ type: 'timestamp' })
  reg_date: Date; // 注册时间
}

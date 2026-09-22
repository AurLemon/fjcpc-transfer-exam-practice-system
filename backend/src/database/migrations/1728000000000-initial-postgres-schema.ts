import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialPostgresSchema1728000000000 implements MigrationInterface {
  name = 'InitialPostgresSchema1728000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.query(`
      CREATE TABLE "users" (
        "uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "nick" varchar(255) NOT NULL,
        "identifier" varchar(255) NOT NULL,
        "id_number" varchar(255),
        "name" varchar(255),
        "password" varchar(255) NOT NULL,
        "school" varchar(100),
        "profession" varchar(100),
        "profession_main_subject" integer NOT NULL DEFAULT -1,
        "permission" integer NOT NULL DEFAULT 0,
        "last_login" timestamp NOT NULL,
        "reg_date" timestamp NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "user_settings" (
        "user" uuid PRIMARY KEY,
        "setting" jsonb NOT NULL,
        "last_modified" timestamp NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "tokens" (
        "uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user" uuid NOT NULL,
        "access_token" varchar(500) NOT NULL,
        "refresh_token" varchar(500) NOT NULL,
        "access_token_expiry" bigint NOT NULL,
        "refresh_token_expiry" bigint NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "login_key" (
        "uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "private_key" varchar(500) NOT NULL,
        "expiry_time" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "request_info" (
        "request_uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "course" integer NOT NULL,
        "id_number" varchar(512) NOT NULL,
        "profession_id" varchar(255),
        "profession_name" varchar(255),
        "subject" integer
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "request_log" (
        "request_uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "round" integer NOT NULL,
        "consuming" timestamp NOT NULL,
        "course" integer NOT NULL,
        "subject" integer NOT NULL,
        "used_id_number" varchar(512) NOT NULL,
        "is_parse" boolean NOT NULL DEFAULT false
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "questions" (
        "unique_code" varchar(36) PRIMARY KEY,
        "pid" varchar(255) NOT NULL,
        "content" text NOT NULL,
        "type" integer NOT NULL,
        "options" jsonb,
        "sub_options" jsonb,
        "answer" jsonb NOT NULL,
        "subject" integer NOT NULL,
        "course" integer NOT NULL,
        "created_time" bigint NOT NULL,
        "updated_time" bigint NOT NULL,
        "crawl_time" bigint NOT NULL,
        "done_count" integer NOT NULL DEFAULT 0,
        "incorrect_count" integer NOT NULL DEFAULT 0,
        "status" boolean NOT NULL DEFAULT true,
        "crawl_count" integer NOT NULL DEFAULT 1
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "done_questions" (
        "uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user" uuid NOT NULL,
        "pid" varchar(255) NOT NULL,
        "subject" integer NOT NULL,
        "course" integer NOT NULL,
        "type" integer NOT NULL,
        "done_time" bigint NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "star_questions" (
        "uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user" uuid NOT NULL,
        "pid" varchar(255) NOT NULL,
        "subject" integer NOT NULL,
        "course" integer NOT NULL,
        "type" integer NOT NULL,
        "stared_time" bigint NOT NULL,
        "folder" varchar(255) NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "updated_questions" (
        "uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "pid" varchar(255) NOT NULL,
        "unique_code" varchar(255) NOT NULL,
        "type" integer NOT NULL,
        "subject" integer NOT NULL,
        "course" integer NOT NULL,
        "updated_time" bigint NOT NULL
      )
    `);

    await queryRunner.query(
      'CREATE INDEX "idx_questions_course_subject_type" ON "questions" ("course", "subject", "type")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_questions_pid" ON "questions" ("pid")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_done_questions_user_pid" ON "done_questions" ("user", "pid")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_star_questions_user_pid" ON "star_questions" ("user", "pid")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_request_info_course_subject" ON "request_info" ("course", "subject")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "updated_questions"');
    await queryRunner.query('DROP TABLE "star_questions"');
    await queryRunner.query('DROP TABLE "done_questions"');
    await queryRunner.query('DROP TABLE "questions"');
    await queryRunner.query('DROP TABLE "request_log"');
    await queryRunner.query('DROP TABLE "request_info"');
    await queryRunner.query('DROP TABLE "login_key"');
    await queryRunner.query('DROP TABLE "tokens"');
    await queryRunner.query('DROP TABLE "user_settings"');
    await queryRunner.query('DROP TABLE "users"');
  }
}

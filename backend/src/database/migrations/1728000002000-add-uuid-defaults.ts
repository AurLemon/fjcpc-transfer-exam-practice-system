import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUuidDefaults1728000002000 implements MigrationInterface {
  name = 'AddUuidDefaults1728000002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    for (const [table, column] of [
      ['users', 'uuid'],
      ['tokens', 'uuid'],
      ['login_key', 'uuid'],
      ['request_info', 'request_uuid'],
      ['request_log', 'request_uuid'],
      ['done_questions', 'uuid'],
      ['star_questions', 'uuid'],
      ['updated_questions', 'uuid'],
    ]) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "${column}" SET DEFAULT gen_random_uuid()`,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, column] of [
      ['updated_questions', 'uuid'],
      ['star_questions', 'uuid'],
      ['done_questions', 'uuid'],
      ['request_log', 'request_uuid'],
      ['request_info', 'request_uuid'],
      ['login_key', 'uuid'],
      ['tokens', 'uuid'],
      ['users', 'uuid'],
    ]) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP DEFAULT`,
      );
    }
  }
}

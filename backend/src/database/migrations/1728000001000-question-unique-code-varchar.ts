import { MigrationInterface, QueryRunner } from 'typeorm';

export class QuestionUniqueCodeVarchar1728000001000 implements MigrationInterface {
  name = 'QuestionUniqueCodeVarchar1728000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "questions" ALTER COLUMN "unique_code" TYPE varchar(36) USING "unique_code"::text',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "questions" ALTER COLUMN "unique_code" TYPE uuid USING "unique_code"::uuid',
    );
  }
}

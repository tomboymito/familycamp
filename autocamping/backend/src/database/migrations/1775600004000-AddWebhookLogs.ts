import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWebhookLogs1775600004000 implements MigrationInterface {
  name = 'AddWebhookLogs1775600004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "webhook_logs" (
        "id"         uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "source"     varchar     NOT NULL,
        "event_type" varchar     NOT NULL DEFAULT 'booking',
        "status"     varchar     NOT NULL DEFAULT 'pending',
        "raw_payload" text,
        "booking_id" uuid,
        "error"      text,
        "created_at" TIMESTAMP   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_webhook_logs" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "webhook_logs"`);
  }
}

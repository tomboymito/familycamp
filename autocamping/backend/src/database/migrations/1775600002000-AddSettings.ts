import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSettings1775600002000 implements MigrationInterface {
    name = 'AddSettings1775600002000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "settings" (
                "key" character varying NOT NULL,
                "value" text,
                CONSTRAINT "PK_settings" PRIMARY KEY ("key")
            )
        `);
        await queryRunner.query(`
            INSERT INTO "settings" ("key", "value") VALUES
                ('camp_name',        'ФэмКэмп'),
                ('camp_address',     ''),
                ('camp_phone',       ''),
                ('camp_email',       ''),
                ('camp_gps',         ''),
                ('checkin_time',     '12:00'),
                ('checkout_time',    '14:00'),
                ('hold_ttl_minutes', '15'),
                ('min_nights',       '1'),
                ('max_nights',       '30'),
                ('booking_horizon',  '365'),
                ('inn',              ''),
                ('bank_account',     ''),
                ('bank_name',        ''),
                ('bank_bik',         '')
            ON CONFLICT DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "settings"`);
    }
}

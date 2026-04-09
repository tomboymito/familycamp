import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBookingTimes1775600001000 implements MigrationInterface {
    name = 'AddBookingTimes1775600001000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bookings" ADD IF NOT EXISTS "check_in_time" character varying NOT NULL DEFAULT '12:00'`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD IF NOT EXISTS "check_out_time" character varying NOT NULL DEFAULT '14:00'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "check_out_time"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "check_in_time"`);
    }
}

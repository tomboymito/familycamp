import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHousekeepingStatus1775600000000 implements MigrationInterface {
    name = 'AddHousekeepingStatus1775600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "places" ADD "housekeeping_status" character varying NOT NULL DEFAULT 'unknown'`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "places" DROP COLUMN "housekeeping_status"`);
    }
}

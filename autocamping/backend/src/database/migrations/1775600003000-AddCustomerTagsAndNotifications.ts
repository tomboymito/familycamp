import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCustomerTagsAndNotifications1775600003000 implements MigrationInterface {
    name = 'AddCustomerTagsAndNotifications1775600003000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "tags" varchar[] NOT NULL DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "total_bookings" integer NOT NULL DEFAULT 0`);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "notification_logs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "booking_id" uuid,
                "customer_id" uuid,
                "channel" character varying NOT NULL,
                "template" character varying NOT NULL,
                "recipient" character varying NOT NULL,
                "status" character varying NOT NULL DEFAULT 'pending',
                "error" text,
                "payload" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_notification_logs" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            INSERT INTO "settings" ("key", "value") VALUES
                ('smtp_host',        ''),
                ('smtp_port',        '587'),
                ('smtp_user',        ''),
                ('smtp_pass',        ''),
                ('smtp_from',        ''),
                ('sms_provider',     ''),
                ('sms_api_key',      ''),
                ('sms_sender',       ''),
                ('tpl_confirm_email', 'Уважаемый {name}, ваше бронирование #{booking_id} подтверждено!\nМесто: {place}, заезд: {check_in} в {check_in_time}, выезд: {check_out} в {check_out_time}.\nСумма: {total_price} ₽.\nЖдём вас в ФэмКэмп!'),
                ('tpl_confirm_sms',  'Бронь #{booking_id} подтверждена. Место {place}, заезд {check_in}. ФэмКэмп'),
                ('tpl_reminder_email','Уважаемый {name}, напоминаем — завтра ваш заезд!\nМесто: {place}, время заезда: {check_in_time}.\nЖдём вас!'),
                ('tpl_reminder_sms', 'Напоминание: завтра ваш заезд в ФэмКэмп. Место {place}, в {check_in_time}.'),
                ('tpl_cancel_email', 'Уважаемый {name}, ваше бронирование #{booking_id} отменено. По вопросам звоните нам.'),
                ('tpl_cancel_sms',   'Бронь #{booking_id} отменена. ФэмКэмп')
            ON CONFLICT DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "notification_logs"`);
        await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN IF EXISTS "tags"`);
        await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN IF EXISTS "total_bookings"`);
    }
}

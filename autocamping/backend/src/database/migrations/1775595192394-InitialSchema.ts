import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1775595192394 implements MigrationInterface {
    name = 'InitialSchema1775595192394'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "reviews_cache" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "source" character varying NOT NULL, "author_name" character varying, "rating" integer, "review_text" text, "review_date" date, "external_id" character varying, "fetched_at" TIMESTAMP NOT NULL, CONSTRAINT "UQ_35a791a87d6520a7608dac5e2a8" UNIQUE ("external_id"), CONSTRAINT "PK_97d4ef935ea6d7f418d7190c0e0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "pricing_rules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type_id" uuid NOT NULL, "valid_from" date NOT NULL, "valid_to" date NOT NULL, "price_per_night" numeric(10,2) NOT NULL, "min_guests" integer NOT NULL DEFAULT '1', "max_guests" integer, "season_label" character varying, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_fda27bb8db4630894decda61ff6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "places" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type_id" uuid NOT NULL, "name" character varying NOT NULL, "code" character varying NOT NULL, "capacity" integer NOT NULL, "has_electricity" boolean NOT NULL DEFAULT false, "has_water" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_a6fe963f6700cb1fe4e68002725" UNIQUE ("code"), CONSTRAINT "PK_1afab86e226b4c3bc9a74465c12" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "booking_id" uuid NOT NULL, "provider" character varying NOT NULL, "provider_payment_id" character varying, "amount" numeric(10,2) NOT NULL, "currency" character varying NOT NULL DEFAULT 'RUB', "status" character varying NOT NULL, "provider_response" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "integration_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "booking_id" uuid NOT NULL, "system" character varying NOT NULL, "event_type" character varying NOT NULL, "status" character varying NOT NULL, "payload" jsonb, "response" jsonb, "attempt_number" integer NOT NULL DEFAULT '1', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_89ba1967bb4ac6c412901cf29a5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "holds" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "place_id" uuid NOT NULL, "check_in" date NOT NULL, "check_out" date NOT NULL, "guests_count" integer NOT NULL, "session_token" character varying NOT NULL, "expires_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_0a5b1b18b6f2bc0916c38296be9" UNIQUE ("session_token"), CONSTRAINT "PK_a8a21700a256e0267fb43f4f7ae" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "customers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "phone" character varying, "email" character varying, "car_number" character varying, "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_133ec679a801fab5e070f73d3ea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "blockings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "place_id" uuid NOT NULL, "date_from" date NOT NULL, "date_to" date NOT NULL, "reason" character varying, "created_by" character varying NOT NULL DEFAULT 'admin', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9a8df0ab9a7ca5c7fc507837573" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "bookings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "place_id" uuid NOT NULL, "customer_id" uuid NOT NULL, "check_in" date NOT NULL, "check_out" date NOT NULL, "guests_count" integer NOT NULL, "source" character varying, "status" character varying NOT NULL, "payment_status" character varying NOT NULL, "total_price" numeric(10,2), "customer_note" text, "admin_note" text, "crm_external_id" character varying, "crm_sync_status" character varying NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "admin_users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "name" character varying NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_dcd0c8a4b10af9c986e510b9ecc" UNIQUE ("email"), CONSTRAINT "PK_06744d221bb6145dc61e5dc441d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "accommodation_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "default_capacity" integer NOT NULL, "description" text, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_2bd3a90df566723960a74d7adea" UNIQUE ("slug"), CONSTRAINT "PK_9b09f2b9ad0f54187bf128002f1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "pricing_rules" ADD CONSTRAINT "FK_4f031e970b204cd2c99bd998f63" FOREIGN KEY ("type_id") REFERENCES "accommodation_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "places" ADD CONSTRAINT "FK_8ce7e3b7c437b33007fd78de935" FOREIGN KEY ("type_id") REFERENCES "accommodation_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_e86edf76dc2424f123b9023a2b2" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "integration_logs" ADD CONSTRAINT "FK_eabaf9f012b10411895fee47c87" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "holds" ADD CONSTRAINT "FK_d1e85dd46017873ce3ec5bb3ca5" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "blockings" ADD CONSTRAINT "FK_54d5518d61f5e04ad29afb35b42" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "FK_76f3ab8104f5f947057760659c5" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "FK_8e21b7ae33e7b0673270de4146f" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "FK_8e21b7ae33e7b0673270de4146f"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "FK_76f3ab8104f5f947057760659c5"`);
        await queryRunner.query(`ALTER TABLE "blockings" DROP CONSTRAINT "FK_54d5518d61f5e04ad29afb35b42"`);
        await queryRunner.query(`ALTER TABLE "holds" DROP CONSTRAINT "FK_d1e85dd46017873ce3ec5bb3ca5"`);
        await queryRunner.query(`ALTER TABLE "integration_logs" DROP CONSTRAINT "FK_eabaf9f012b10411895fee47c87"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_e86edf76dc2424f123b9023a2b2"`);
        await queryRunner.query(`ALTER TABLE "places" DROP CONSTRAINT "FK_8ce7e3b7c437b33007fd78de935"`);
        await queryRunner.query(`ALTER TABLE "pricing_rules" DROP CONSTRAINT "FK_4f031e970b204cd2c99bd998f63"`);
        await queryRunner.query(`DROP TABLE "accommodation_types"`);
        await queryRunner.query(`DROP TABLE "admin_users"`);
        await queryRunner.query(`DROP TABLE "bookings"`);
        await queryRunner.query(`DROP TABLE "blockings"`);
        await queryRunner.query(`DROP TABLE "customers"`);
        await queryRunner.query(`DROP TABLE "holds"`);
        await queryRunner.query(`DROP TABLE "integration_logs"`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP TABLE "places"`);
        await queryRunner.query(`DROP TABLE "pricing_rules"`);
        await queryRunner.query(`DROP TABLE "reviews_cache"`);
    }

}

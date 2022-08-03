import { MigrationInterface, QueryRunner } from 'typeorm';

export class migration1659491509557 implements MigrationInterface {
  name = 'migration1659491509557';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."category_type_enum" AS ENUM('listening', 'wikiblock', 'event')
        `);
    await queryRunner.query(`
            CREATE TABLE "category" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "title" character varying(255) NOT NULL,
                "type" "public"."category_type_enum" NOT NULL,
                "weight" integer NOT NULL,
                "created_at" TIMESTAMP NOT NULL,
                "updated_at" TIMESTAMP,
                CONSTRAINT "PK_9c4e4a89e3674fc9f382d733f03" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "country" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(255) NOT NULL,
                "created_at" TIMESTAMP NOT NULL,
                "updated_at" TIMESTAMP,
                CONSTRAINT "PK_bf6e37c231c4f4ea56dcd887269" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "speaker" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "email" character varying,
                "phone" character varying,
                "address" character varying,
                "avatar" character varying,
                "position" character varying,
                "company" character varying,
                "socials" jsonb,
                "created_at" TIMESTAMP NOT NULL,
                "updated_at" TIMESTAMP,
                CONSTRAINT "PK_8441432fc32d602d417bf2687a9" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "sponsor" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "logo" character varying NOT NULL,
                "created_at" TIMESTAMP NOT NULL,
                "updated_at" TIMESTAMP,
                CONSTRAINT "PK_31c4354cde945c685aabe017541" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "event" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "introduction" character varying NOT NULL,
                "medias" jsonb,
                "agenda" jsonb,
                "social_profiles" jsonb,
                "map" jsonb,
                "start_date" TIMESTAMP NOT NULL,
                "end_date" TIMESTAMP NOT NULL,
                "phone" character varying NOT NULL,
                "website" character varying NOT NULL,
                "location" character varying NOT NULL,
                "created_at" TIMESTAMP NOT NULL,
                "updated_at" TIMESTAMP,
                "country_id" uuid,
                CONSTRAINT "PK_30c2f3bbaf6d34a55f8ae6e4614" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "crypto_asset_tag" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(255) NOT NULL,
                "created_at" TIMESTAMP NOT NULL,
                "updated_at" TIMESTAMP,
                CONSTRAINT "PK_085149e9543db5f135d96b42102" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "event_categories" (
                "event_id" uuid NOT NULL,
                "category_id" uuid NOT NULL,
                CONSTRAINT "PK_612fc92db0790503827c0b82af9" PRIMARY KEY ("event_id", "category_id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_c78c7b670b392b79ee76f01b67" ON "event_categories" ("event_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_372a350b878524310e04d0ddec" ON "event_categories" ("category_id")
        `);
    await queryRunner.query(`
            CREATE TABLE "event_speakers" (
                "event_id" uuid NOT NULL,
                "speaker_id" uuid NOT NULL,
                CONSTRAINT "PK_42ce853c8c1ca8b6b4f0fb76e98" PRIMARY KEY ("event_id", "speaker_id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_600c2c351361372ee94e1a3bdc" ON "event_speakers" ("event_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_c9240644498eafaed1553eb19f" ON "event_speakers" ("speaker_id")
        `);
    await queryRunner.query(`
            CREATE TABLE "event_sponsors" (
                "event_id" uuid NOT NULL,
                "sponsor_id" uuid NOT NULL,
                CONSTRAINT "PK_7efb6474e1d10a623f65697ffed" PRIMARY KEY ("event_id", "sponsor_id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_8fab88035a7a74536060237b40" ON "event_sponsors" ("event_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_4cb75f6aae3ff8fe35cd341738" ON "event_sponsors" ("sponsor_id")
        `);
    await queryRunner.query(`
            CREATE TABLE "event_tag" (
                "tag_id" uuid NOT NULL,
                "event_id" uuid NOT NULL,
                CONSTRAINT "PK_b2e240c76ed8ac07e36e5514efb" PRIMARY KEY ("tag_id", "event_id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_fd388aa11a6c289a257c490326" ON "event_tag" ("tag_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_d2613e3b02f6840bbef2cffbcb" ON "event_tag" ("event_id")
        `);
    await queryRunner.query(`
            ALTER TABLE "event"
            ADD CONSTRAINT "FK_9d3288d71ad2b95c583a8fe90e2" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "event_categories"
            ADD CONSTRAINT "FK_c78c7b670b392b79ee76f01b675" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
    await queryRunner.query(`
            ALTER TABLE "event_categories"
            ADD CONSTRAINT "FK_372a350b878524310e04d0ddec2" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
    await queryRunner.query(`
            ALTER TABLE "event_speakers"
            ADD CONSTRAINT "FK_600c2c351361372ee94e1a3bdc1" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
    await queryRunner.query(`
            ALTER TABLE "event_speakers"
            ADD CONSTRAINT "FK_c9240644498eafaed1553eb19f9" FOREIGN KEY ("speaker_id") REFERENCES "speaker"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
    await queryRunner.query(`
            ALTER TABLE "event_sponsors"
            ADD CONSTRAINT "FK_8fab88035a7a74536060237b404" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
    await queryRunner.query(`
            ALTER TABLE "event_sponsors"
            ADD CONSTRAINT "FK_4cb75f6aae3ff8fe35cd3417383" FOREIGN KEY ("sponsor_id") REFERENCES "sponsor"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
    await queryRunner.query(`
            ALTER TABLE "event_tag"
            ADD CONSTRAINT "FK_fd388aa11a6c289a257c4903265" FOREIGN KEY ("tag_id") REFERENCES "crypto_asset_tag"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
    await queryRunner.query(`
            ALTER TABLE "event_tag"
            ADD CONSTRAINT "FK_d2613e3b02f6840bbef2cffbcbb" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "event_tag" DROP CONSTRAINT "FK_d2613e3b02f6840bbef2cffbcbb"
        `);
    await queryRunner.query(`
            ALTER TABLE "event_tag" DROP CONSTRAINT "FK_fd388aa11a6c289a257c4903265"
        `);
    await queryRunner.query(`
            ALTER TABLE "event_sponsors" DROP CONSTRAINT "FK_4cb75f6aae3ff8fe35cd3417383"
        `);
    await queryRunner.query(`
            ALTER TABLE "event_sponsors" DROP CONSTRAINT "FK_8fab88035a7a74536060237b404"
        `);
    await queryRunner.query(`
            ALTER TABLE "event_speakers" DROP CONSTRAINT "FK_c9240644498eafaed1553eb19f9"
        `);
    await queryRunner.query(`
            ALTER TABLE "event_speakers" DROP CONSTRAINT "FK_600c2c351361372ee94e1a3bdc1"
        `);
    await queryRunner.query(`
            ALTER TABLE "event_categories" DROP CONSTRAINT "FK_372a350b878524310e04d0ddec2"
        `);
    await queryRunner.query(`
            ALTER TABLE "event_categories" DROP CONSTRAINT "FK_c78c7b670b392b79ee76f01b675"
        `);
    await queryRunner.query(`
            ALTER TABLE "event" DROP CONSTRAINT "FK_9d3288d71ad2b95c583a8fe90e2"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_d2613e3b02f6840bbef2cffbcb"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_fd388aa11a6c289a257c490326"
        `);
    await queryRunner.query(`
            DROP TABLE "event_tag"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_4cb75f6aae3ff8fe35cd341738"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_8fab88035a7a74536060237b40"
        `);
    await queryRunner.query(`
            DROP TABLE "event_sponsors"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_c9240644498eafaed1553eb19f"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_600c2c351361372ee94e1a3bdc"
        `);
    await queryRunner.query(`
            DROP TABLE "event_speakers"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_372a350b878524310e04d0ddec"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_c78c7b670b392b79ee76f01b67"
        `);
    await queryRunner.query(`
            DROP TABLE "event_categories"
        `);
    await queryRunner.query(`
            DROP TABLE "crypto_asset_tag"
        `);
    await queryRunner.query(`
            DROP TABLE "event"
        `);
    await queryRunner.query(`
            DROP TABLE "sponsor"
        `);
    await queryRunner.query(`
            DROP TABLE "speaker"
        `);
    await queryRunner.query(`
            DROP TABLE "country"
        `);
    await queryRunner.query(`
            DROP TABLE "category"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."category_type_enum"
        `);
  }
}

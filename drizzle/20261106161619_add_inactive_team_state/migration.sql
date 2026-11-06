CREATE TYPE "public"."team_state_new" AS ENUM('draft', 'ready', 'playing', 'hiring', 'firing', 'improving', 'inactive');--> statement-breakpoint
ALTER TABLE "team" ALTER COLUMN "state" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "team" ALTER COLUMN "state" TYPE "public"."team_state_new" USING "state"::text::"public"."team_state_new";--> statement-breakpoint
ALTER TABLE "team" ALTER COLUMN "state" SET DEFAULT 'draft';--> statement-breakpoint
UPDATE "team" SET "state" = 'inactive' WHERE "state" = 'draft';--> statement-breakpoint
DROP TYPE "public"."team_state";--> statement-breakpoint
ALTER TYPE "public"."team_state_new" RENAME TO "team_state";

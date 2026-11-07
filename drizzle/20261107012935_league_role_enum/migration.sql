CREATE TYPE "league_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
ALTER TABLE "session" DROP COLUMN "impersonated_by";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "role";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "banned";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "ban_reason";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "ban_expires";--> statement-breakpoint
ALTER TABLE "invitation" ALTER COLUMN "role" SET DATA TYPE "league_role" USING "role"::"league_role";--> statement-breakpoint
ALTER TABLE "member" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "member" ALTER COLUMN "role" SET DATA TYPE "league_role" USING "role"::"league_role";--> statement-breakpoint
ALTER TABLE "member" ALTER COLUMN "role" SET DEFAULT 'member'::"league_role";
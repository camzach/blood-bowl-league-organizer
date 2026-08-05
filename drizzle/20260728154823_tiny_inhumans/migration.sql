-- Step 1: Rename column first
ALTER TABLE "account" RENAME COLUMN "account_id" TO "provider_account_id";--> statement-breakpoint

-- Step 2: Rename constraints
ALTER TABLE "account" RENAME CONSTRAINT "account_user_id_user_id_fk" TO "account_user_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "invitation" RENAME CONSTRAINT "invitation_league_id_league_id_fk" TO "invitation_league_id_league_id_fkey";--> statement-breakpoint
ALTER TABLE "invitation" RENAME CONSTRAINT "invitation_inviter_id_user_id_fk" TO "invitation_inviter_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "member" RENAME CONSTRAINT "member_league_id_league_id_fk" TO "member_league_id_league_id_fkey";--> statement-breakpoint
ALTER TABLE "member" RENAME CONSTRAINT "member_user_id_user_id_fk" TO "member_user_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "session" RENAME CONSTRAINT "session_user_id_user_id_fk" TO "session_user_id_user_id_fkey";--> statement-breakpoint

-- Step 3: Add issuer column as NULLABLE first (to allow backfilling)
ALTER TABLE "account" ADD COLUMN "issuer" text;--> statement-breakpoint

-- Step 4: Backfill issuer based on provider_id
-- For credential-based accounts (password field is not null)
UPDATE "account" 
SET "issuer" = 'local:credential' 
WHERE "password" IS NOT NULL;--> statement-breakpoint

-- For OAuth accounts without a specific issuer, use local:oauth:<provider_id>
-- This handles all remaining accounts that don't have password
UPDATE "account" 
SET "issuer" = 'local:oauth:' || "provider_id"
WHERE "issuer" IS NULL;--> statement-breakpoint

-- Step 5: Now make issuer NOT NULL after backfilling
ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL;--> statement-breakpoint

-- Step 6: Apply all other column defaults and constraints
ALTER TABLE "account" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "invitation" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "invitation" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "league" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "member" ALTER COLUMN "role" SET DEFAULT 'member';--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "email_verified" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "banned" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint

-- Step 7: Create indexes (including the unique compound index on issuer + provider_account_id)
CREATE UNIQUE INDEX "account_issuer_providerAccountId_uidx" ON "account" ("issuer","provider_account_id");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "invitation_leagueId_idx" ON "invitation" ("league_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" ("email");--> statement-breakpoint
CREATE INDEX "member_leagueId_idx" ON "member" ("league_id");--> statement-breakpoint
CREATE INDEX "member_userId_idx" ON "member" ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint

-- Step 8: Update foreign key constraints to add CASCADE deletes
ALTER TABLE "account" DROP CONSTRAINT "account_user_id_user_id_fkey", ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invitation" DROP CONSTRAINT "invitation_league_id_league_id_fkey", ADD CONSTRAINT "invitation_league_id_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "league"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invitation" DROP CONSTRAINT "invitation_inviter_id_user_id_fkey", ADD CONSTRAINT "invitation_inviter_id_user_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "member" DROP CONSTRAINT "member_league_id_league_id_fkey", ADD CONSTRAINT "member_league_id_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "league"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "member" DROP CONSTRAINT "member_user_id_user_id_fkey", ADD CONSTRAINT "member_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" DROP CONSTRAINT "session_user_id_user_id_fkey", ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

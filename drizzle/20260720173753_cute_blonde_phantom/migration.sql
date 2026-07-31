ALTER TABLE "inducement" RENAME COLUMN "special_price_rule" TO "special_price_rule_name";--> statement-breakpoint
ALTER TABLE "inducement" RENAME COLUMN "special_price_roster" TO "special_price_roster_name";--> statement-breakpoint
ALTER TABLE "inducement" RENAME COLUMN "special_max_rule" TO "special_max_rule_name";--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN "created_at" timestamp NOT NULL;--> statement-breakpoint
DROP INDEX "player_team_id_index";--> statement-breakpoint
CREATE UNIQUE INDEX "player_team_id_index" ON "player" ("team_id") WHERE "is_captain" = true;--> statement-breakpoint
DROP INDEX "season_league_id_index";--> statement-breakpoint
CREATE UNIQUE INDEX "season_league_id_index" ON "season" ("league_id") WHERE "is_active" = true;
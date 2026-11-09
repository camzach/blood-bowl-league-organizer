ALTER TABLE "bracket_game" ADD COLUMN "league_id" text;--> statement-breakpoint
ALTER TABLE "game" ADD COLUMN "league_id" text;--> statement-breakpoint
ALTER TABLE "game_details" ADD COLUMN "league_id" text;--> statement-breakpoint
ALTER TABLE "round_robin_game" ADD COLUMN "league_id" text;--> statement-breakpoint
UPDATE "game_details" SET "league_id" = "team"."league_id" FROM "team" WHERE "team"."id" = "game_details"."team_id";--> statement-breakpoint
UPDATE "round_robin_game" SET "league_id" = "season"."league_id" FROM "season" WHERE "season"."id" = "round_robin_game"."season_id";--> statement-breakpoint
UPDATE "bracket_game" SET "league_id" = "season"."league_id" FROM "season" WHERE "season"."id" = "bracket_game"."season_id";--> statement-breakpoint
UPDATE "game" SET "league_id" = COALESCE(
	(SELECT "league_id" FROM "game_details" WHERE "game_details"."id" = "game"."home_details_id"),
	(SELECT "league_id" FROM "game_details" WHERE "game_details"."id" = "game"."away_details_id"),
	(SELECT "league_id" FROM "round_robin_game" WHERE "round_robin_game"."game_id" = "game"."id"),
	(SELECT "league_id" FROM "bracket_game" WHERE "bracket_game"."game_id" = "game"."id")
);--> statement-breakpoint
ALTER TABLE "bracket_game" ALTER COLUMN "league_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "game" ALTER COLUMN "league_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "game_details" ALTER COLUMN "league_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "round_robin_game" ALTER COLUMN "league_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "game" ADD CONSTRAINT "game_id_league_id_uniq" UNIQUE("id","league_id");--> statement-breakpoint
ALTER TABLE "game_details" ADD CONSTRAINT "game_details_id_league_id_uniq" UNIQUE("id","league_id");--> statement-breakpoint
ALTER TABLE "season" ADD CONSTRAINT "season_id_league_id_uniq" UNIQUE("id","league_id");--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_id_league_id_uniq" UNIQUE("id","league_id");--> statement-breakpoint
ALTER TABLE "bracket_game" ADD CONSTRAINT "bracket_game_league_id_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "league"("id");--> statement-breakpoint
ALTER TABLE "bracket_game" ADD CONSTRAINT "bracket_game_game_league_fk" FOREIGN KEY ("game_id","league_id") REFERENCES "game"("id","league_id");--> statement-breakpoint
ALTER TABLE "bracket_game" ADD CONSTRAINT "bracket_game_season_league_fk" FOREIGN KEY ("season_id","league_id") REFERENCES "season"("id","league_id");--> statement-breakpoint
ALTER TABLE "game" ADD CONSTRAINT "game_league_id_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "league"("id");--> statement-breakpoint
ALTER TABLE "game" ADD CONSTRAINT "game_home_details_league_fk" FOREIGN KEY ("home_details_id","league_id") REFERENCES "game_details"("id","league_id");--> statement-breakpoint
ALTER TABLE "game" ADD CONSTRAINT "game_away_details_league_fk" FOREIGN KEY ("away_details_id","league_id") REFERENCES "game_details"("id","league_id");--> statement-breakpoint
ALTER TABLE "game_details" ADD CONSTRAINT "game_details_league_id_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "league"("id");--> statement-breakpoint
ALTER TABLE "game_details" ADD CONSTRAINT "game_details_team_league_fk" FOREIGN KEY ("team_id","league_id") REFERENCES "team"("id","league_id");--> statement-breakpoint
ALTER TABLE "round_robin_game" ADD CONSTRAINT "round_robin_game_league_id_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "league"("id");--> statement-breakpoint
ALTER TABLE "round_robin_game" ADD CONSTRAINT "round_robin_game_game_league_fk" FOREIGN KEY ("game_id","league_id") REFERENCES "game"("id","league_id");--> statement-breakpoint
ALTER TABLE "round_robin_game" ADD CONSTRAINT "round_robin_game_season_league_fk" FOREIGN KEY ("season_id","league_id") REFERENCES "season"("id","league_id");
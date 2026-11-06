CREATE INDEX "coach_to_team_team_id_idx" ON "coach_to_team" ("team_id");--> statement-breakpoint
CREATE INDEX "game_details_team_id_idx" ON "game_details" ("team_id");--> statement-breakpoint
CREATE INDEX "player_team_id_idx" ON "player" ("team_id");--> statement-breakpoint
CREATE INDEX "round_robin_game_season_id_idx" ON "round_robin_game" ("season_id");--> statement-breakpoint
CREATE INDEX "season_league_id_idx" ON "season" ("league_id");--> statement-breakpoint
CREATE INDEX "team_league_id_idx" ON "team" ("league_id");
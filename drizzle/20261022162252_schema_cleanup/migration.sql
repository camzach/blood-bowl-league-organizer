ALTER TABLE "bracket_game" ALTER COLUMN "season_id" SET DATA TYPE varchar(25) USING "season_id"::varchar(25);--> statement-breakpoint
ALTER TABLE "bracket_game" ALTER COLUMN "game_id" SET DATA TYPE varchar(25) USING "game_id"::varchar(25);--> statement-breakpoint
ALTER TABLE "coach_to_team" ALTER COLUMN "team_id" SET DATA TYPE varchar(25) USING "team_id"::varchar(25);--> statement-breakpoint
ALTER TABLE "faq" ALTER COLUMN "id" SET DATA TYPE varchar(25) USING "id"::varchar(25);--> statement-breakpoint
ALTER TABLE "faq_to_skill" ALTER COLUMN "faq_id" SET DATA TYPE varchar(25) USING "faq_id"::varchar(25);--> statement-breakpoint
ALTER TABLE "game" ALTER COLUMN "id" SET DATA TYPE varchar(25) USING "id"::varchar(25);--> statement-breakpoint
ALTER TABLE "game" ALTER COLUMN "away_details_id" SET DATA TYPE varchar(25) USING "away_details_id"::varchar(25);--> statement-breakpoint
ALTER TABLE "game" ALTER COLUMN "home_details_id" SET DATA TYPE varchar(25) USING "home_details_id"::varchar(25);--> statement-breakpoint
ALTER TABLE "game_details" ALTER COLUMN "id" SET DATA TYPE varchar(25) USING "id"::varchar(25);--> statement-breakpoint
ALTER TABLE "game_details" ALTER COLUMN "team_id" SET DATA TYPE varchar(25) USING "team_id"::varchar(25);--> statement-breakpoint
ALTER TABLE "game_details" ALTER COLUMN "mvp_id" SET DATA TYPE varchar(25) USING "mvp_id"::varchar(25);--> statement-breakpoint
ALTER TABLE "game_details_to_inducement" ALTER COLUMN "game_details_id" SET DATA TYPE varchar(25) USING "game_details_id"::varchar(25);--> statement-breakpoint
ALTER TABLE "game_details_to_star_player" ALTER COLUMN "game_details_id" SET DATA TYPE varchar(25) USING "game_details_id"::varchar(25);--> statement-breakpoint
ALTER TABLE "improvement" ALTER COLUMN "player_id" SET DATA TYPE varchar(25) USING "player_id"::varchar(25);--> statement-breakpoint
ALTER TABLE "pending_random_skill" ALTER COLUMN "player_id" SET DATA TYPE varchar(25) USING "player_id"::varchar(25);--> statement-breakpoint
ALTER TABLE "pending_random_stat" ALTER COLUMN "player_id" SET DATA TYPE varchar(25) USING "player_id"::varchar(25);--> statement-breakpoint
ALTER TABLE "player" ALTER COLUMN "team_id" SET DATA TYPE varchar(25) USING "team_id"::varchar(25);--> statement-breakpoint
ALTER TABLE "position" ALTER COLUMN "id" SET DATA TYPE varchar(25) USING "id"::varchar(25);--> statement-breakpoint
ALTER TABLE "position" ALTER COLUMN "roster_slot_id" SET DATA TYPE varchar(25) USING "roster_slot_id"::varchar(25);--> statement-breakpoint
ALTER TABLE "roster_slot" ALTER COLUMN "id" SET DATA TYPE varchar(25) USING "id"::varchar(25);--> statement-breakpoint
ALTER TABLE "round_robin_game" ALTER COLUMN "game_id" SET DATA TYPE varchar(25) USING "game_id"::varchar(25);--> statement-breakpoint
ALTER TABLE "round_robin_game" ALTER COLUMN "season_id" SET DATA TYPE varchar(25) USING "season_id"::varchar(25);--> statement-breakpoint
ALTER TABLE "team" ALTER COLUMN "league_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "inducement" ADD CONSTRAINT "inducement_special_price_condition" CHECK (("special_price" IS NULL) = ("special_price_rule_name" IS NULL AND "special_price_roster_name" IS NULL));--> statement-breakpoint
ALTER TABLE "player" ADD CONSTRAINT "player_team_membership_nullity" CHECK (("team_id" IS NULL) = ("membership_type" IS NULL));--> statement-breakpoint
ALTER TABLE "skill_relation" ADD CONSTRAINT "skill_relation_conflicts_ordered" CHECK ("type" != 'conflicts' OR "skill_name_a" < "skill_name_b");
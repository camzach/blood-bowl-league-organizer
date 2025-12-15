CREATE TYPE "public"."game_state" AS ENUM('scheduled', 'journeymen', 'inducements', 'in_progress', 'complete');--> statement-breakpoint
CREATE TYPE "public"."improvement_type" AS ENUM('st', 'ma', 'ag', 'pa', 'av', 'chosen_skill', 'random_skill', 'fallback_skill', 'automatic_skill');--> statement-breakpoint
CREATE TYPE "public"."membership_type" AS ENUM('player', 'journeyman', 'retired');--> statement-breakpoint
CREATE TYPE "public"."skill_category" AS ENUM('general', 'agility', 'mutation', 'passing', 'strength', 'trait', 'devious');--> statement-breakpoint
CREATE TYPE "public"."skill_relation_type" AS ENUM('conflicts', 'requires');--> statement-breakpoint
CREATE TYPE "public"."team_state" AS ENUM('draft', 'ready', 'playing', 'hiring', 'improving');--> statement-breakpoint
CREATE TYPE "public"."weather" AS ENUM('blizzard', 'pouring_rain', 'perfect', 'very_sunny', 'sweltering_heat');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"league_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "league" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"discord_guild_id" text,
	"metadata" text,
	CONSTRAINT "league_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"league_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	"active_league_id" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"role" text,
	"banned" boolean,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "bracket_game" (
	"season_id" varchar(255) NOT NULL,
	"round" integer NOT NULL,
	"seed" integer NOT NULL,
	"game_id" varchar(255) PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_to_team" (
	"coach_id" varchar(255) NOT NULL,
	"team_id" varchar(255) NOT NULL,
	CONSTRAINT "coach_to_team_coach_id_team_id_pk" PRIMARY KEY("coach_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "faq" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"q" text NOT NULL,
	"a" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faq_to_skill" (
	"skill_name" varchar(255) NOT NULL,
	"faq_id" varchar(255) NOT NULL,
	CONSTRAINT "faq_to_skill_skill_name_faq_id_pk" PRIMARY KEY("skill_name","faq_id")
);
--> statement-breakpoint
CREATE TABLE "game" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"state" "game_state" DEFAULT 'scheduled' NOT NULL,
	"away_details_id" varchar(255),
	"home_details_id" varchar(255),
	"weather" "weather",
	"scheduled_time" timestamp,
	"discord_event_id" varchar,
	CONSTRAINT "game_away_details_id_unique" UNIQUE("away_details_id"),
	CONSTRAINT "game_home_details_id_unique" UNIQUE("home_details_id")
);
--> statement-breakpoint
CREATE TABLE "game_details" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"team_id" varchar(255) NOT NULL,
	"touchdowns" integer DEFAULT 0 NOT NULL,
	"casualties" integer DEFAULT 0 NOT NULL,
	"petty_cash_awarded" integer DEFAULT 0 NOT NULL,
	"journeymen_required" integer,
	"fan_factor" integer DEFAULT 0 NOT NULL,
	"mvp_id" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "game_details_to_inducement" (
	"game_details_id" varchar(255) NOT NULL,
	"inducement_name" varchar(255) NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "game_details_to_inducement_game_details_id_inducement_name_pk" PRIMARY KEY("game_details_id","inducement_name")
);
--> statement-breakpoint
CREATE TABLE "game_details_to_star_player" (
	"game_details_id" varchar(255) NOT NULL,
	"star_player_name" varchar(255) NOT NULL,
	CONSTRAINT "game_details_to_star_player_game_details_id_star_player_name_pk" PRIMARY KEY("game_details_id","star_player_name")
);
--> statement-breakpoint
CREATE TABLE "improvement" (
	"type" "improvement_type" NOT NULL,
	"player_id" varchar(255) NOT NULL,
	"order" integer NOT NULL,
	"skill_name" varchar(255),
	CONSTRAINT "improvement_player_id_order_pk" PRIMARY KEY("player_id","order")
);
--> statement-breakpoint
CREATE TABLE "inducement" (
	"name" varchar(255) PRIMARY KEY NOT NULL,
	"max" integer NOT NULL,
	"price" integer,
	"special_price" integer,
	"special_price_rule" varchar(255),
	"special_price_roster" text,
	"special_max" integer,
	"special_max_rule" text
);
--> statement-breakpoint
CREATE TABLE "keyword" (
	"name" text PRIMARY KEY NOT NULL,
	"can_be_hated" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "keyword_to_position" (
	"keyword_name" text NOT NULL,
	"position_id" text NOT NULL,
	CONSTRAINT "keyword_to_position_keyword_name_position_id_pk" PRIMARY KEY("keyword_name","position_id")
);
--> statement-breakpoint
CREATE TABLE "keyword_to_star_player" (
	"keyword_name" text NOT NULL,
	"star_player_name" text NOT NULL,
	CONSTRAINT "keyword_to_star_player_keyword_name_star_player_name_pk" PRIMARY KEY("keyword_name","star_player_name")
);
--> statement-breakpoint
CREATE TABLE "optional_special_rule_to_roster" (
	"special_rule_name" varchar(255) NOT NULL,
	"roster_name" varchar(255) NOT NULL,
	CONSTRAINT "optional_special_rule_to_roster_special_rule_name_roster_name_pk" PRIMARY KEY("special_rule_name","roster_name")
);
--> statement-breakpoint
CREATE TABLE "pending_random_skill" (
	"player_id" varchar(255) PRIMARY KEY NOT NULL,
	"skill_name_1" varchar(255) NOT NULL,
	"skill_name_2" varchar(255) NOT NULL,
	"category" "skill_category" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_random_stat" (
	"player_id" varchar(255) PRIMARY KEY NOT NULL,
	"roll" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player" (
	"id" varchar(25) PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"number" integer NOT NULL,
	"is_captain" boolean DEFAULT false NOT NULL,
	"niggling_injuries" integer DEFAULT 0 NOT NULL,
	"miss_next_game" boolean DEFAULT false NOT NULL,
	"dead" boolean DEFAULT false NOT NULL,
	"ag_injuries" integer DEFAULT 0 NOT NULL,
	"ma_injuries" integer DEFAULT 0 NOT NULL,
	"pa_injuries" integer DEFAULT 0 NOT NULL,
	"st_injuries" integer DEFAULT 0 NOT NULL,
	"av_injuries" integer DEFAULT 0 NOT NULL,
	"touchdowns" integer DEFAULT 0 NOT NULL,
	"completions" integer DEFAULT 0 NOT NULL,
	"interceptions" integer DEFAULT 0 NOT NULL,
	"casualties" integer DEFAULT 0 NOT NULL,
	"safe_landings" integer DEFAULT 0 NOT NULL,
	"mvps" integer DEFAULT 0 NOT NULL,
	"other_spp" integer DEFAULT 0 NOT NULL,
	"seasons_played" integer DEFAULT 0 NOT NULL,
	"position_id" varchar(25) NOT NULL,
	"team_id" varchar(255),
	"membership_type" "membership_type"
);
--> statement-breakpoint
CREATE TABLE "position" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"cost" integer NOT NULL,
	"ma" integer NOT NULL,
	"st" integer NOT NULL,
	"ag" integer NOT NULL,
	"pa" integer,
	"av" integer NOT NULL,
	"primary" smallint NOT NULL,
	"secondary" smallint NOT NULL,
	"roster_slot_id" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roster" (
	"name" varchar(255) PRIMARY KEY NOT NULL,
	"reroll_cost" integer NOT NULL,
	"tier" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roster_slot" (
	"roster_name" varchar(255) NOT NULL,
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"max" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "round_robin_game" (
	"game_id" varchar(255) PRIMARY KEY NOT NULL,
	"season_id" varchar(255) NOT NULL,
	"round" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "season" (
	"id" varchar(25) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"league_id" varchar NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill" (
	"name" varchar(255) PRIMARY KEY NOT NULL,
	"rules" text NOT NULL,
	"category" "skill_category" NOT NULL,
	"active" boolean,
	"elite" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_relation" (
	"skill_name_a" varchar(255) NOT NULL,
	"skill_name_b" varchar(255) NOT NULL,
	"type" "skill_relation_type" NOT NULL,
	CONSTRAINT "skill_relation_skill_name_a_skill_name_b_type_pk" PRIMARY KEY("skill_name_a","skill_name_b","type")
);
--> statement-breakpoint
CREATE TABLE "skill_to_position" (
	"skill_name" varchar(255) NOT NULL,
	"position_id" varchar(25) NOT NULL,
	CONSTRAINT "skill_to_position_skill_name_position_id_pk" PRIMARY KEY("skill_name","position_id")
);
--> statement-breakpoint
CREATE TABLE "skill_to_star_player" (
	"skill_name" varchar(255) NOT NULL,
	"star_player_name" varchar(255) NOT NULL,
	CONSTRAINT "skill_to_star_player_skill_name_star_player_name_pk" PRIMARY KEY("skill_name","star_player_name")
);
--> statement-breakpoint
CREATE TABLE "song" (
	"name" varchar(255) PRIMARY KEY NOT NULL,
	"data" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "special_rule" (
	"name" varchar(255) PRIMARY KEY NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "special_rule_to_roster" (
	"special_rule_name" varchar(255) NOT NULL,
	"roster_name" varchar(255) NOT NULL,
	CONSTRAINT "special_rule_to_roster_special_rule_name_roster_name_pk" PRIMARY KEY("special_rule_name","roster_name")
);
--> statement-breakpoint
CREATE TABLE "sr_to_sp" (
	"star_player_name" varchar(255) NOT NULL,
	"special_rule_name" varchar(255) NOT NULL,
	CONSTRAINT "sr_to_sp_star_player_name_special_rule_name_pk" PRIMARY KEY("star_player_name","special_rule_name")
);
--> statement-breakpoint
CREATE TABLE "star_player" (
	"name" varchar(255) PRIMARY KEY NOT NULL,
	"hiring_fee" integer NOT NULL,
	"ma" integer NOT NULL,
	"st" integer NOT NULL,
	"ag" integer NOT NULL,
	"pa" integer,
	"av" integer NOT NULL,
	"partner_name" varchar(255),
	"special_ability" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team" (
	"id" varchar(25) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"league_id" text,
	"treasury" integer DEFAULT 1000000 NOT NULL,
	"state" "team_state" DEFAULT 'draft' NOT NULL,
	"roster_name" varchar(255) NOT NULL,
	"chosen_special_rule_name" varchar(255),
	"rerolls" integer DEFAULT 0 NOT NULL,
	"cheerleaders" integer DEFAULT 0 NOT NULL,
	"assistant_coaches" integer DEFAULT 0 NOT NULL,
	"apothecary" boolean DEFAULT false NOT NULL,
	"dedicated_fans" integer DEFAULT 1 NOT NULL,
	"touchdown_song" varchar(255),
	CONSTRAINT "name" UNIQUE("name","league_id")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_league_id_league_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."league"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_league_id_league_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."league"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bracket_game" ADD CONSTRAINT "bracket_game_season_id_season_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."season"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bracket_game" ADD CONSTRAINT "bracket_game_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_to_team" ADD CONSTRAINT "coach_to_team_coach_id_user_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_to_team" ADD CONSTRAINT "coach_to_team_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faq_to_skill" ADD CONSTRAINT "faq_to_skill_skill_name_skill_name_fk" FOREIGN KEY ("skill_name") REFERENCES "public"."skill"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faq_to_skill" ADD CONSTRAINT "faq_to_skill_faq_id_faq_id_fk" FOREIGN KEY ("faq_id") REFERENCES "public"."faq"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game" ADD CONSTRAINT "game_away_details_id_game_details_id_fk" FOREIGN KEY ("away_details_id") REFERENCES "public"."game_details"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game" ADD CONSTRAINT "game_home_details_id_game_details_id_fk" FOREIGN KEY ("home_details_id") REFERENCES "public"."game_details"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_details" ADD CONSTRAINT "game_details_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_details" ADD CONSTRAINT "game_details_mvp_id_player_id_fk" FOREIGN KEY ("mvp_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_details_to_inducement" ADD CONSTRAINT "game_details_to_inducement_game_details_id_game_details_id_fk" FOREIGN KEY ("game_details_id") REFERENCES "public"."game_details"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_details_to_inducement" ADD CONSTRAINT "game_details_to_inducement_inducement_name_inducement_name_fk" FOREIGN KEY ("inducement_name") REFERENCES "public"."inducement"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_details_to_star_player" ADD CONSTRAINT "game_details_to_star_player_game_details_id_game_details_id_fk" FOREIGN KEY ("game_details_id") REFERENCES "public"."game_details"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_details_to_star_player" ADD CONSTRAINT "game_details_to_star_player_star_player_name_star_player_name_fk" FOREIGN KEY ("star_player_name") REFERENCES "public"."star_player"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "improvement" ADD CONSTRAINT "improvement_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "improvement" ADD CONSTRAINT "improvement_skill_name_skill_name_fk" FOREIGN KEY ("skill_name") REFERENCES "public"."skill"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inducement" ADD CONSTRAINT "inducement_special_price_rule_special_rule_name_fk" FOREIGN KEY ("special_price_rule") REFERENCES "public"."special_rule"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inducement" ADD CONSTRAINT "inducement_special_price_roster_roster_name_fk" FOREIGN KEY ("special_price_roster") REFERENCES "public"."roster"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inducement" ADD CONSTRAINT "inducement_special_max_rule_special_rule_name_fk" FOREIGN KEY ("special_max_rule") REFERENCES "public"."special_rule"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_to_position" ADD CONSTRAINT "keyword_to_position_keyword_name_keyword_name_fk" FOREIGN KEY ("keyword_name") REFERENCES "public"."keyword"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_to_position" ADD CONSTRAINT "keyword_to_position_position_id_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."position"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_to_star_player" ADD CONSTRAINT "keyword_to_star_player_keyword_name_keyword_name_fk" FOREIGN KEY ("keyword_name") REFERENCES "public"."keyword"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_to_star_player" ADD CONSTRAINT "keyword_to_star_player_star_player_name_star_player_name_fk" FOREIGN KEY ("star_player_name") REFERENCES "public"."star_player"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optional_special_rule_to_roster" ADD CONSTRAINT "optional_special_rule_to_roster_special_rule_name_special_rule_name_fk" FOREIGN KEY ("special_rule_name") REFERENCES "public"."special_rule"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optional_special_rule_to_roster" ADD CONSTRAINT "optional_special_rule_to_roster_roster_name_roster_name_fk" FOREIGN KEY ("roster_name") REFERENCES "public"."roster"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_random_skill" ADD CONSTRAINT "pending_random_skill_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_random_skill" ADD CONSTRAINT "pending_random_skill_skill_name_1_skill_name_fk" FOREIGN KEY ("skill_name_1") REFERENCES "public"."skill"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_random_skill" ADD CONSTRAINT "pending_random_skill_skill_name_2_skill_name_fk" FOREIGN KEY ("skill_name_2") REFERENCES "public"."skill"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_random_stat" ADD CONSTRAINT "pending_random_stat_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player" ADD CONSTRAINT "player_position_id_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."position"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player" ADD CONSTRAINT "player_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position" ADD CONSTRAINT "position_roster_slot_id_roster_slot_id_fk" FOREIGN KEY ("roster_slot_id") REFERENCES "public"."roster_slot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_slot" ADD CONSTRAINT "roster_slot_roster_name_roster_name_fk" FOREIGN KEY ("roster_name") REFERENCES "public"."roster"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_robin_game" ADD CONSTRAINT "round_robin_game_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_robin_game" ADD CONSTRAINT "round_robin_game_season_id_season_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."season"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season" ADD CONSTRAINT "season_league_id_league_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."league"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_relation" ADD CONSTRAINT "skill_relation_skill_name_a_skill_name_fk" FOREIGN KEY ("skill_name_a") REFERENCES "public"."skill"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_relation" ADD CONSTRAINT "skill_relation_skill_name_b_skill_name_fk" FOREIGN KEY ("skill_name_b") REFERENCES "public"."skill"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_to_position" ADD CONSTRAINT "skill_to_position_skill_name_skill_name_fk" FOREIGN KEY ("skill_name") REFERENCES "public"."skill"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_to_position" ADD CONSTRAINT "skill_to_position_position_id_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."position"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_to_star_player" ADD CONSTRAINT "skill_to_star_player_skill_name_skill_name_fk" FOREIGN KEY ("skill_name") REFERENCES "public"."skill"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_to_star_player" ADD CONSTRAINT "skill_to_star_player_star_player_name_star_player_name_fk" FOREIGN KEY ("star_player_name") REFERENCES "public"."star_player"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_rule_to_roster" ADD CONSTRAINT "special_rule_to_roster_special_rule_name_special_rule_name_fk" FOREIGN KEY ("special_rule_name") REFERENCES "public"."special_rule"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_rule_to_roster" ADD CONSTRAINT "special_rule_to_roster_roster_name_roster_name_fk" FOREIGN KEY ("roster_name") REFERENCES "public"."roster"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sr_to_sp" ADD CONSTRAINT "sr_to_sp_star_player_name_star_player_name_fk" FOREIGN KEY ("star_player_name") REFERENCES "public"."star_player"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sr_to_sp" ADD CONSTRAINT "sr_to_sp_special_rule_name_special_rule_name_fk" FOREIGN KEY ("special_rule_name") REFERENCES "public"."special_rule"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "star_player" ADD CONSTRAINT "star_player_partner_name_star_player_name_fk" FOREIGN KEY ("partner_name") REFERENCES "public"."star_player"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_league_id_league_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."league"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_roster_name_roster_name_fk" FOREIGN KEY ("roster_name") REFERENCES "public"."roster"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_chosen_special_rule_name_special_rule_name_fk" FOREIGN KEY ("chosen_special_rule_name") REFERENCES "public"."special_rule"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_touchdown_song_song_name_fk" FOREIGN KEY ("touchdown_song") REFERENCES "public"."song"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bracket_game_season_id_round_seed_index" ON "bracket_game" USING btree ("season_id","round","seed");--> statement-breakpoint
CREATE UNIQUE INDEX "player_team_id_index" ON "player" USING btree ("team_id") WHERE "player"."is_captain" = true;--> statement-breakpoint
CREATE INDEX "roster_slot_idx" ON "roster_slot" USING btree ("roster_name");--> statement-breakpoint
CREATE UNIQUE INDEX "season_league_id_index" ON "season" USING btree ("league_id") WHERE "season"."is_active" = true;

ALTER TABLE "team" DROP CONSTRAINT "team_touchdown_song_song_name_fk";--> statement-breakpoint
ALTER TABLE "song" RENAME COLUMN "data" TO "id";--> statement-breakpoint
ALTER TABLE "song" DROP CONSTRAINT "song_pkey";--> statement-breakpoint
ALTER TABLE "song" ADD PRIMARY KEY ("id");--> statement-breakpoint
UPDATE "team" SET "touchdown_song" = "song"."id" FROM "song" WHERE "song"."name" = "team"."touchdown_song";--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "touchdown_song_uniq" UNIQUE("touchdown_song");--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_touchdown_song_song_id_fkey" FOREIGN KEY ("touchdown_song") REFERENCES "song"("id");
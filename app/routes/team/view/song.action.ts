import { S3 } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { z } from "zod";
import { createValidatedAction } from "~/app/utils/action";
import { Route } from "./+types/song.action";
import { db } from "~/app/utils/drizzle";
import { song as dbSong, team as dbTeam } from "~/db/schema";
import { eq } from "drizzle-orm";

const s3 = new S3({
  region: process.env.S3_REGION ?? "",
  credentials: {
    accessKeyId: process.env.S3_KEY_ID ?? "",
    secretAccessKey: process.env.S3_KEY ?? "",
  },
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
});

const songSchema = z.object({
  teamId: z.string(),
  songName: z.string().min(1, "Song name is required"),
  file: z.instanceof(File),
});

export const action = createValidatedAction(
  songSchema,
  async (data, { params }: Route.ActionArgs) => {
    const { teamId, songName, file } = data;

    // Permission check handled by team-permission-middleware layout

    // Validate file is audio
    const buffer = await file.arrayBuffer();
    
    // Basic MIME type check
    if (!file.type.startsWith("audio/")) {
      return { errors: { file: ["Audio files only"] } };
    }

    const team = await db.query.team.findFirst({
      where: { id: teamId },
      with: { song: true },
    });

    if (!team) {
      throw new Error("No team found");
    }

    const currentSong = team.song;

    // Delete old song from S3 if exists
    if (currentSong) {
      try {
        await s3.deleteObject({
          Bucket: process.env.S3_BUCKET ?? "",
          Key: currentSong.data,
        });
      } catch (error) {
        console.error("Error removing old song from S3:", error);
        throw new Error("There was an issue removing the old song");
      }
    }

    // Upload new song to S3
    const Key = randomUUID();
    try {
      await s3.putObject({
        Bucket: process.env.S3_BUCKET ?? "",
        Key,
        Body: Buffer.from(buffer),
        ContentType: file.type,
      });
    } catch (error) {
      console.error("Error storing new song in S3:", error);
      throw new Error("There was an issue storing the song.");
    }

    // Update database
    await db.transaction(async (tx) => {
      await tx
        .insert(dbSong)
        .values({ data: Key, name: songName })
        .onConflictDoUpdate({
          target: dbSong.name,
          set: { data: Key },
        });

      await tx
        .update(dbTeam)
        .set({ touchdownSong: songName })
        .where(eq(dbTeam.id, teamId));
    });

    return { success: true };
  },
);

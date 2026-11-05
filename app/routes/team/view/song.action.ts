import { S3 } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { z } from "zod";
import { createValidatedAction } from "~/app/utils/action";
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

export const action = createValidatedAction(songSchema, async (data) => {
  const { teamId, songName, file } = data;

  // Permission check handled by team-permission-middleware layout

  // Basic MIME type check
  if (!file.type.startsWith("audio/")) {
    return { errors: { file: ["Audio files only"] } };
  }

  // Limit file size to 10MB
  if (file.size > 10 * 1024 * 1024) {
    return { errors: { file: ["Audio file size must be less than 10MB"] } };
  }

  // Validate file is audio
  const buffer = await file.arrayBuffer();

  const team = await db.query.team.findFirst({
    where: { id: teamId },
    with: { song: true },
  });

  if (!team) {
    throw new Error("No team found");
  }

  const currentSong = team.song;

  // Upload new song to S3
  const songId = randomUUID();
  try {
    await s3.putObject({
      Bucket: process.env.S3_BUCKET ?? "",
      Key: songId,
      Body: Buffer.from(buffer),
      ContentType: file.type,
    });
  } catch (error) {
    console.error("Error storing new song in S3:", error);
    throw new Error("There was an issue storing the song.", {
      cause: error,
    });
  }

  // Update database
  await db.transaction(async (tx) => {
    // 1. Insert new entry in song table pointing to the new S3 object
    await tx.insert(dbSong).values({ id: songId, name: songName });

    // 2. Swap the team's pointer to point to the new song record
    await tx
      .update(dbTeam)
      .set({ touchdownSong: songId })
      .where(eq(dbTeam.id, teamId));

    // 3. Delete the old song record from the database to clean up the database orphan
    if (currentSong) {
      await tx.delete(dbSong).where(eq(dbSong.id, currentSong.id));
    }
  });

  // 4. Clean up the old S3 file AFTER the database transaction succeeds!
  if (currentSong) {
    try {
      await s3.deleteObject({
        Bucket: process.env.S3_BUCKET ?? "",
        Key: currentSong.id,
      });
    } catch (error) {
      console.error(
        "Warning: Failed to clean up old S3 file from bucket:",
        error,
      );
    }
  }

  return { success: true };
});

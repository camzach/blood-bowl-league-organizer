"use server";

import { S3 } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { team as dbTeam, song as dbSong } from "~/db/schema";
import { eq } from "drizzle-orm";
import { fileTypeFromBuffer } from "file-type";
import { db } from "~/utils/drizzle";
import { action, teamPermissionMiddleware } from "~/utils/safe-action";
import { z } from "zod";

const s3 = new S3({
  region: process.env.S3_REGION ?? "",
  credentials: {
    accessKeyId: process.env.S3_KEY_ID ?? "",
    secretAccessKey: process.env.S3_KEY ?? "",
  },
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
});

export const uploadTouchdownSong = action
  .inputSchema(
    z.object({
      teamId: z.string(),
      songName: z.string(),
      file: z.instanceof(File),
    }),
  )
  .use(async ({ next, clientInput }) => {
    const { teamId } = z.object({ teamId: z.string() }).parse(clientInput);
    return next({ ctx: { authParams: { teamId: teamId } } });
  })
  .use(teamPermissionMiddleware)
  .action(async ({ parsedInput: { teamId, songName, file } }) => {
    const buffer = await file.arrayBuffer();
    const type = await fileTypeFromBuffer(Buffer.from(buffer));

    if (!type || !type.mime.startsWith("audio")) {
      throw new Error("Audio files only");
    }

    const team = await db.query.team.findFirst({
      where: eq(dbTeam.id, teamId),
      with: { song: true },
    });

    if (!team) {
      throw new Error("No team found");
    }

    const currentSong = team.song;

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

    const Key = randomUUID();
    try {
      await s3.putObject({
        Bucket: process.env.S3_BUCKET ?? "",
        Key,
        Body: Buffer.from(buffer),
        ContentType: type.mime,
      });
    } catch (error) {
      console.error("Error storing new song in S3:", error);
      throw new Error("There was an issue storing the song.");
    }

    await db.transaction(async (tx) => {
      await tx
        .insert(dbSong)
        .values([{ data: Key, name: songName }])
        .then(() =>
          tx
            .update(dbTeam)
            .set({
              touchdownSong: songName,
            })
            .where(eq(dbTeam.id, teamId)),
        );
    });

    return { success: true };
  });

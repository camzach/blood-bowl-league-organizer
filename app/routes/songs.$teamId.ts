import { S3 } from "@aws-sdk/client-s3";
import { data } from "react-router";
import type { Route } from "./+types/songs.$teamId";
import { db } from "~/app/utils/drizzle";

const s3 = new S3({
  region: process.env.S3_REGION ?? "",
  credentials: {
    accessKeyId: process.env.S3_KEY_ID ?? "",
    secretAccessKey: process.env.S3_KEY ?? "",
  },
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
});

export async function loader({ params }: Route.LoaderArgs) {
  const team = await db.query.team.findFirst({
    where: { id: decodeURIComponent(params.teamId) },
    with: { song: true },
  });

  if (!team) {
    throw data("No team found", { status: 404 });
  }

  if (!team.song) {
    throw data("Team has no songs", { status: 404 });
  }

  try {
    const object = await s3.getObject({
      Bucket: process.env.S3_BUCKET ?? "",
      Key: team.song.data,
    });

    if (object.Body === undefined) {
      throw data("There was an issue retrieving the song.", { status: 500 });
    }

    // Convert the stream to a buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of object.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Return the audio file with appropriate headers
    return new Response(buffer, {
      headers: {
        "Content-Type": object.ContentType ?? "audio/mpeg",
        "Content-Length": object.ContentLength?.toString() ?? "",
      },
    });
  } catch (error) {
    console.error("Error retrieving song from S3:", error);
    throw data("There was an issue retrieving the song.", { status: 500 });
  }
}

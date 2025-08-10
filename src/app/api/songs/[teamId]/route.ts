import { S3 } from "@aws-sdk/client-s3";
import { team as dbTeam } from "db/schema";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "utils/drizzle";

const s3 = new S3({
  region: process.env.S3_REGION ?? "",
  credentials: {
    accessKeyId: process.env.S3_KEY_ID ?? "",
    secretAccessKey: process.env.S3_KEY ?? "",
  },
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
});

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ teamId: string }> },
) {
  const params = await props.params;
  const team = await db.query.team.findFirst({
    where: eq(dbTeam.id, decodeURIComponent(params.teamId)),
    with: { song: true },
  });
  if (!team) return new NextResponse("No team found", { status: 404 });

  if (!team.song) return new NextResponse("Team has no songs", { status: 404 });

  try {
    const object = await s3.getObject({
      Bucket: process.env.S3_BUCKET ?? "",
      Key: team.song.data,
    });

    if (object.Body === undefined)
      return new NextResponse("There was an issue retrieving the song.", {
        status: 500,
      });

    return new NextResponse(object.Body as Blob);
  } catch {
    return new NextResponse("There was an issue retrieving the song.", {
      status: 500,
    });
  }
}

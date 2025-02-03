import { S3 } from "@aws-sdk/client-s3";
import { canEditTeam } from "app/(app)/team/[teamId]/edit/actions";
import { randomUUID } from "crypto";
import { team as dbTeam, song as dbSong } from "db/schema";
import { eq } from "drizzle-orm";
import { fileTypeFromBuffer } from "file-type";
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
  { params }: { params: { teamId: string } },
) {
  const team = await db.query.team.findFirst({
    where: eq(dbTeam.id, decodeURIComponent(params.teamId)),
    with: { song: true },
  });
  if (!team) return new NextResponse("No team found", { status: 404 });

  if (!canEditTeam(decodeURIComponent(params.teamId)))
    return new NextResponse("Unauthorized", { status: 503 });

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

export async function POST(
  req: NextRequest,
  { params }: { params: { teamId: string } },
) {
  if (!canEditTeam(decodeURIComponent(params.teamId)))
    return new NextResponse("Unauthorized", { status: 503 });

  const form = await req.formData();
  const file = form.get("file");
  const songName = form.get("songName");

  if (file === null || typeof file === "string")
    return new NextResponse("No file uploaded", { status: 400 });

  if (songName === null || typeof songName !== "string")
    return new NextResponse("No song name provided", { status: 400 });

  const buffer = await file.arrayBuffer();
  const type = await fileTypeFromBuffer(buffer);

  if (!type || !type.mime.startsWith("audio"))
    return new NextResponse("Audio files only", { status: 400 });

  try {
    const team = await db.query.team.findFirst({
      where: eq(dbTeam.id, decodeURIComponent(params.teamId)),
      with: { song: true },
    });
    if (!team) return new NextResponse("No team found", { status: 404 });

    if (!canEditTeam(decodeURIComponent(params.teamId)))
      return new NextResponse("Unauthorized", { status: 503 });

    const current = team.song;

    if (current) {
      await s3.deleteObject({
        Bucket: process.env.S3_BUCKET ?? "",
        Key: current.data,
      });
    }
  } catch {
    return new NextResponse("There was an issue removing the old song");
  }

  const Key = randomUUID();
  try {
    await s3.putObject({
      Bucket: process.env.S3_BUCKET ?? "",
      Key,
      Body: Buffer.from(buffer),
      ContentType: type.mime,
    });
  } catch {
    return new NextResponse("There was an issue storing the song.", {
      status: 500,
    });
  }

  await db
    .insert(dbSong)
    .values([{ data: Key, name: songName }])
    .then(() =>
      db
        .update(dbTeam)
        .set({
          touchdownSong: songName,
        })
        .where(eq(dbTeam.id, decodeURIComponent(params.teamId))),
    );
  return new NextResponse("Success");
}

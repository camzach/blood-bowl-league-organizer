import { S3 } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import { getServerSession } from 'next-auth';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { authOptions } from 'pages/api/auth/[...nextauth]';
import { prisma } from 'utils/prisma';

export async function GET(req: NextRequest, { params }: { params: { team: string } }) {
  const { touchdownSong } = await prisma.team.findUniqueOrThrow({
    where: { name: params.team },
    select: { touchdownSong: true },
  });

  if (!touchdownSong)
    return new NextResponse('Team has no songs', { status: 404 });

  try {
    const s3 = new S3({
      region: process.env.S3_REGION ?? '',
      credentials: {
        accessKeyId: process.env.S3_KEY_ID ?? '',
        secretAccessKey: process.env.S3_KEY ?? '',
      },
    });
    const object = await s3.getObject({
      Bucket: process.env.S3_BUCKET ?? '',
      Key: touchdownSong.data,
    });

    if (object.Body === undefined)
      return new NextResponse('There was an issue retrieving the song.', { status: 500 });

    return new NextResponse(object.Body as Blob);
  } catch {
    return new NextResponse('There was an issue retrieving the song.', { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { team: string } }) {
  const session = await getServerSession(authOptions);

  if (!(session?.user.teams.includes(params.team) ?? false))
    return new NextResponse('You do not have permission', { status: 403 });

  const form = await req.formData();
  const file = form.get('file');
  const songName = form.get('songName');

  if (file === null || typeof file === 'string')
    return new NextResponse('No file uploaded', { status: 400 });

  if (songName === null || typeof songName !== 'string')
    return new NextResponse('No song name provided', { status: 400 });

  const buffer = await file.arrayBuffer();
  const type = await fileTypeFromBuffer(buffer);

  if (!type || !type.mime.startsWith('audio'))
    return new NextResponse('Audio files only', { status: 400 });

  const s3 = new S3({
    region: process.env.S3_REGION ?? '',
    credentials: {
      accessKeyId: process.env.S3_KEY_ID ?? '',
      secretAccessKey: process.env.S3_KEY ?? '',
    },
  });

  try {
    const { touchdownSong: current } = await prisma.team.findUniqueOrThrow({
      where: { name: params.team },
      select: { touchdownSong: true },
    });
    if (current) {
      await s3.deleteObject({
        Bucket: process.env.S3_BUCKET ?? '',
        Key: current.data,
      });
    }
  } catch {
    return new NextResponse('There was an issue removing the old song');
  }

  const Key = randomUUID();
  try {
    await s3.putObject({
      Bucket: process.env.S3_BUCKET ?? '',
      Key,
      Body: Buffer.from(buffer),
      ContentType: type.mime,
    });
  } catch {
    return new NextResponse('There was an issue storing the song.', { status: 500 });
  }

  await prisma.team.update({
    where: { name: params.team },
    data: { touchdownSong: { create: { data: Key, name: songName } } },
  });
  return new NextResponse('Success');
}

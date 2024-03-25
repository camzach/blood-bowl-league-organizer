import { currentUser } from "@clerk/nextjs";
import { league as dbLeague } from "db/schema";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "utils/drizzle";

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user?.publicMetadata.isAdmin) return;

  const leagueName = req.nextUrl.searchParams.get("league");
  if (!leagueName) {
    return;
  }

  const league = await db.query.league.findFirst({
    where: eq(dbLeague.name, leagueName),
  });
  if (!league?.discordGuildId) return;

  const res = await fetch(
    `https://discord.com/api/v10/guilds/${league.discordGuildId}`,
    {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      },
    },
  );
  const resolvedGuild = await res.json();

  return Response.json(resolvedGuild.name);
}

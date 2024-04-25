import { currentUser } from "@clerk/nextjs/server";
import { league as dbLeague } from "db/schema";
import { eq } from "drizzle-orm";
import { db } from "utils/drizzle";

export async function GET() {
  const user = await currentUser();
  if (!user?.publicMetadata.isAdmin) return;

  const leagueName = user.publicMetadata.league as string | undefined;
  if (!leagueName) {
    return;
  }

  const league = await db.query.league.findFirst({
    where: eq(dbLeague.name, leagueName),
  });
  if (!league?.discordGuildId) return Response.json(null);

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

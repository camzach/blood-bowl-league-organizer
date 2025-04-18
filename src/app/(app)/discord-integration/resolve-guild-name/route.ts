import { auth } from "auth";
import { league as dbLeague } from "db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "utils/drizzle";

export async function GET() {
  const apiSession = await auth.api.getSession({ headers: await headers() });
  if (!apiSession) {
    throw new Error("Not authenticated");
  }
  const { user, session } = apiSession;

  if (!session.activeOrganizationId || user.role !== "admin") {
    throw new Error("Not authenticated");
  }

  const leagueId = session.activeOrganizationId || undefined;
  if (!leagueId) {
    return;
  }

  const league = await db.query.league.findFirst({
    where: eq(dbLeague.name, leagueId),
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

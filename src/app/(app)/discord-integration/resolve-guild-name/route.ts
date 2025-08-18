import { auth } from "~/auth";
import { league as dbLeague } from "~/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "~/utils/drizzle";
import { isLeagueAdmin } from "~/utils/is-league-admin";

export async function GET() {
  const apiSession = await auth.api.getSession({ headers: await headers() });
  if (!apiSession) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { user, session } = apiSession;

  if (
    !session.activeOrganizationId ||
    !(await isLeagueAdmin(user.id, session.activeOrganizationId))
  ) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const leagueId = session.activeOrganizationId; // activeOrganizationId is the league ID
  if (!leagueId) {
    return Response.json({ error: "No active league found" }, { status: 400 });
  }

  const league = await db.query.league.findFirst({
    where: eq(dbLeague.id, leagueId), // Assuming leagueId is the ID, not the name
  });

  if (!league?.discordGuildId) return Response.json(null);

  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${league.discordGuildId}`,
      {
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        },
      },
    );

    if (!res.ok) {
      const errorData = await res.json();
      console.error("Discord API error:", errorData);
      return Response.json(
        { error: "Failed to resolve guild name from Discord" },
        { status: res.status },
      );
    }

    const resolvedGuild = await res.json();
    return Response.json(resolvedGuild.name);
  } catch (error) {
    console.error("Error fetching Discord guild name:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

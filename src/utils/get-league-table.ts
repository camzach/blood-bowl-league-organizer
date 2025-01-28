import { season } from "db/schema";
import { and, eq } from "drizzle-orm";
import { db as drizzle } from "./drizzle";
import { auth } from "auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function getLeagueTable(
  tx?: Parameters<Parameters<typeof drizzle.transaction>[0]>[0],
) {
  const db = tx ?? drizzle;
  const session = await auth.api.getSession({
    headers: headers(),
  });
  if (!session?.user) {
    return redirect("/");
  }

  const activeSeason = await db.query.season.findFirst({
    where: and(
      eq(season.leagueName, session.session.activeOrganizationId ?? ""),
      eq(season.isActive, true),
    ),
    with: {
      roundRobinGames: {
        with: {
          game: {
            with: {
              homeDetails: {
                with: { team: { columns: { name: true, id: true } } },
              },
              awayDetails: {
                with: { team: { columns: { name: true, id: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!activeSeason) {
    throw new Error(
      "No season currently active. Ask your league administrator when the next one begins!",
    );
  }

  const games = activeSeason.roundRobinGames;

  const teams = new Set(
    games.flatMap(({ game: { homeDetails, awayDetails } }) =>
      homeDetails && awayDetails
        ? [
            { name: homeDetails.team.name, id: homeDetails.team.id },
            { name: awayDetails.team.name, id: awayDetails.team.id },
          ]
        : [],
    ),
  );

  const table = games.reduce(
    (prev, { game: { state, homeDetails, awayDetails } }) => {
      if (state !== "complete") return prev;
      const next = { ...prev };

      // Bye
      if (!homeDetails || !awayDetails) {
        return next;
      }

      // Win / Loss / Draw
      if (homeDetails.touchdowns > awayDetails.touchdowns) {
        next[homeDetails.team.id].points += 3;
        next[homeDetails.team.id].wins += 1;
        next[awayDetails.team.id].losses += 1;
      }
      if (homeDetails.touchdowns < awayDetails.touchdowns) {
        next[awayDetails.team.id].points += 3;
        next[awayDetails.team.id].wins += 1;
        next[homeDetails.team.id].losses += 1;
      }
      if (homeDetails.touchdowns === awayDetails.touchdowns) {
        next[homeDetails.team.id].points += 1;
        next[awayDetails.team.id].points += 1;
        next[homeDetails.team.id].draws += 1;
        next[awayDetails.team.id].draws += 1;
      }

      // Casualties
      if (homeDetails.casualties >= 3) next[homeDetails.team.id].points += 1;
      if (awayDetails.casualties >= 3) next[awayDetails.team.id].points += 1;

      // Perfect Defense
      if (homeDetails.touchdowns === 0) next[awayDetails.team.id].points += 1;
      if (awayDetails.touchdowns === 0) next[homeDetails.team.id].points += 1;

      // Major Win
      if (homeDetails.touchdowns >= 3) next[homeDetails.team.id].points += 1;
      if (awayDetails.touchdowns >= 3) next[awayDetails.team.id].points += 1;

      // Stats
      next[homeDetails.team.id].td += homeDetails.touchdowns;
      next[awayDetails.team.id].td += awayDetails.touchdowns;
      next[homeDetails.team.id].cas += homeDetails.casualties;
      next[awayDetails.team.id].cas += awayDetails.casualties;
      next[homeDetails.team.id].tdDiff +=
        homeDetails.touchdowns - awayDetails.touchdowns;
      next[awayDetails.team.id].tdDiff +=
        awayDetails.touchdowns - homeDetails.touchdowns;
      next[homeDetails.team.id].casDiff +=
        homeDetails.casualties - awayDetails.casualties;
      next[awayDetails.team.id].casDiff +=
        awayDetails.casualties - homeDetails.casualties;

      return next;
    },
    Object.fromEntries(
      Array.from(teams.values(), (team) => [
        team.id,
        {
          name: team.name,
          points: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          td: 0,
          cas: 0,
          tdDiff: 0,
          casDiff: 0,
        },
      ]),
    ),
  );
  return table;
}

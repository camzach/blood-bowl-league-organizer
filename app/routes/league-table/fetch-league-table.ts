import { db } from "~/app/utils/drizzle";
import { roundRobinGamesWithTeams } from "~/db/query-fragments/game.fragments";
import { computeLeagueTable, type TeamStats } from "~/app/utils/league-table";

export default async function fetchLeagueTable(
  leagueId: string,
): Promise<Record<string, TeamStats>> {
  const activeSeason = await db.query.season.findFirst({
    where: {
      leagueId,
      isActive: true,
    },
    with: {
      roundRobinGames: roundRobinGamesWithTeams,
    },
  });

  if (!activeSeason) {
    throw new Error("No active season found");
  }

  return computeLeagueTable(activeSeason.roundRobinGames);
}

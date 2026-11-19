import { db } from "~/app/utils/drizzle";

const teamName = { with: { team: { columns: { name: true } } } } as const;

export default async function fetchGames({
  league,
  teamId,
  state,
}: {
  league: string;
  teamId?: string | string[];
  state?: string;
}) {
  const teamIds = teamId === undefined ? [] : [teamId].flat();
  const gameState =
    state === "completed"
      ? "complete"
      : state === "scheduled"
        ? "scheduled"
        : undefined;

  const seasonGames = await db.query.roundRobinGame.findMany({
    where: { leagueId: league, season: { isActive: true } },
    with: {
      game: {
        with: { homeDetails: teamName, awayDetails: teamName },
      },
    },
  });

  const teamMap = new Map<string, string>();
  const games = seasonGames.flatMap(({ round, game }) => {
    const { homeDetails, awayDetails } = game;
    if (!homeDetails || !awayDetails) {
      return [];
    }
    teamMap.set(homeDetails.teamId, homeDetails.team.name);
    teamMap.set(awayDetails.teamId, awayDetails.team.name);

    if (gameState && game.state !== gameState) {
      return [];
    }
    if (
      teamIds.length > 0 &&
      !teamIds.includes(homeDetails.teamId) &&
      !teamIds.includes(awayDetails.teamId)
    ) {
      return [];
    }
    return {
      round,
      state: game.state,
      time: game.scheduledTime,
      id: game.id,
      homeDetails: {
        teamName: homeDetails.team.name,
        teamId: homeDetails.teamId,
        touchdowns: homeDetails.touchdowns,
        casualties: homeDetails.casualties,
      },
      awayDetails: {
        teamName: awayDetails.team.name,
        teamId: awayDetails.teamId,
        touchdowns: awayDetails.touchdowns,
        casualties: awayDetails.casualties,
      },
    };
  });

  const teams = Array.from(teamMap, ([id, name]) => ({ id, name }));
  return { teams, games };
}

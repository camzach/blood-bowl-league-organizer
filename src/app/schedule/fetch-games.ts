import { gameDetails, team, game, roundRobinGame, season } from "db/schema";
import { or, eq, and, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "utils/drizzle";

export default async function fetchGames({
  league,
  teamId,
  state,
}: {
  league: string;
  teamId?: string | string[];
  state?: string;
}) {
  const homeDetails = alias(gameDetails, "home_details");
  const awayDetails = alias(gameDetails, "away_details");
  const homeTeam = alias(team, "home_team");
  const awayTeam = alias(team, "away_team");

  const teamsQuery = db.query.team.findMany({
    where: and(eq(team.leagueName, league)),
    columns: { name: true, id: true },
    orderBy: sql`LOWER(${team.name})`,
  });

  const gameTeamFilter = Array.isArray(teamId)
    ? or(
        ...teamId.flatMap((id) => [
          eq(homeDetails.teamId, id),
          eq(awayDetails.teamId, id),
        ]),
      )
    : typeof teamId === "string"
      ? or(eq(homeDetails.teamId, teamId), eq(awayDetails.teamId, teamId))
      : undefined;
  const gameStateFilter = {
    completed: eq(game.state, "complete"),
    scheduled: eq(game.state, "scheduled"),
  }[state ?? "any"];

  const gamesQuery = db
    .select({
      round: roundRobinGame.round,
      state: game.state,
      time: game.scheduledTime,
      homeDetails: {
        teamName: homeTeam.name,
        teamId: homeTeam.id,
        touchdowns: homeDetails.touchdowns,
        casualties: homeDetails.casualties,
      },
      awayDetails: {
        teamName: awayTeam.name,
        teamId: awayTeam.id,
        touchdowns: awayDetails.touchdowns,
        casualties: awayDetails.casualties,
      },
      id: game.id,
    })
    .from(season)
    .innerJoin(roundRobinGame, eq(season.id, roundRobinGame.seasonId))
    .innerJoin(game, eq(game.id, roundRobinGame.gameId))
    .innerJoin(homeDetails, eq(homeDetails.id, game.homeDetailsId))
    .innerJoin(homeTeam, eq(homeTeam.id, homeDetails.teamId))
    .innerJoin(awayDetails, eq(awayDetails.id, game.awayDetailsId))
    .innerJoin(awayTeam, eq(awayTeam.id, awayDetails.teamId))
    .where(
      and(
        gameTeamFilter,
        gameStateFilter,
        eq(season.leagueName, league),
        eq(season.isActive, true),
      ),
    );

  const [games, teams] = await Promise.all([gamesQuery, teamsQuery]);
  return { teams, games };
}

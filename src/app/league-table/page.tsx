import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import drizzle from "utils/drizzle";
import { roundRobinGame } from "db/schema";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "League Table" };

async function getLeagueTable(activeSeason: string) {
  const games = await drizzle.query.roundRobinGame.findMany({
    where: eq(roundRobinGame.seasonName, activeSeason),
    with: {
      game: {
        with: {
          homeDetails: true,
          awayDetails: true,
        },
      },
    },
  });

  const teams = new Set(
    games.flatMap(({ game: { homeDetails, awayDetails } }) => [
      homeDetails.teamName,
      awayDetails.teamName,
    ])
  );

  const table = games.reduce(
    (prev, { game: { state, homeDetails, awayDetails } }) => {
      if (state !== "complete") return prev;
      const next = { ...prev };

      // Win / Loss / Draw
      if (homeDetails.touchdowns > awayDetails.touchdowns) {
        next[homeDetails.teamName].points += 3;
        next[homeDetails.teamName].wins += 1;
        next[awayDetails.teamName].losses += 1;
      }
      if (homeDetails.touchdowns < awayDetails.touchdowns) {
        next[awayDetails.teamName].points += 3;
        next[awayDetails.teamName].wins += 1;
        next[homeDetails.teamName].losses += 1;
      }
      if (homeDetails.touchdowns === awayDetails.touchdowns) {
        next[homeDetails.teamName].points += 1;
        next[awayDetails.teamName].points += 1;
        next[homeDetails.teamName].draws += 1;
        next[awayDetails.teamName].draws += 1;
      }

      // Casualties
      if (homeDetails.casualties >= 3) next[homeDetails.teamName].points += 1;
      if (awayDetails.casualties >= 3) next[awayDetails.teamName].points += 1;

      // Perfect Defense
      if (homeDetails.touchdowns === 0) next[awayDetails.teamName].points += 1;
      if (awayDetails.touchdowns === 0) next[homeDetails.teamName].points += 1;

      // Major Win
      if (homeDetails.touchdowns >= 3) next[homeDetails.teamName].points += 1;
      if (awayDetails.touchdowns >= 3) next[awayDetails.teamName].points += 1;

      // Stats
      next[homeDetails.teamName].td += homeDetails.touchdowns;
      next[awayDetails.teamName].td += awayDetails.touchdowns;
      next[homeDetails.teamName].cas += homeDetails.casualties;
      next[awayDetails.teamName].cas += awayDetails.casualties;
      next[homeDetails.teamName].tdDiff +=
        homeDetails.touchdowns - awayDetails.touchdowns;
      next[awayDetails.teamName].tdDiff +=
        awayDetails.touchdowns - homeDetails.touchdowns;
      next[homeDetails.teamName].casDiff +=
        homeDetails.casualties - awayDetails.casualties;
      next[awayDetails.teamName].casDiff +=
        awayDetails.casualties - homeDetails.casualties;

      return next;
    },
    Object.fromEntries(
      Array.from(teams.values(), (team) => [
        team,
        {
          points: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          td: 0,
          cas: 0,
          tdDiff: 0,
          casDiff: 0,
        },
      ])
    )
  );
  return table;
}

export default async function Page() {
  const activeSeason = process.env.ACTIVE_SEASON;
  if (activeSeason === undefined) return <>No active season</>;
  const table = await getLeagueTable(activeSeason);

  return (
    <table className="table table-zebra mx-auto w-3/5">
      <thead>
        <tr>
          <th>Team</th>
          <th>League Points</th>
          <th>Wins</th>
          <th>Losses</th>
          <th>Draws</th>
          <th>Touchdowns</th>
          <th>TD Difference</th>
          <th>Casualties</th>
          <th>Cas Difference</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(table)
          .sort(([, a], [, b]) => {
            if (a.points !== b.points) return b.points - a.points;
            // Tiebreakers
            if (a.tdDiff !== b.tdDiff) return b.tdDiff - a.tdDiff;
            if (a.casDiff !== b.casDiff) return b.casDiff - a.casDiff;
            if (a.tdDiff + a.casDiff !== b.tdDiff + b.casDiff)
              return b.tdDiff + b.casDiff - (a.tdDiff + b.casDiff);
            return 0;
          })
          .map(([team, stats]) => (
            <tr key={team}>
              <td>{team}</td>
              <td>{stats.points}</td>
              <td>{stats.wins}</td>
              <td>{stats.losses}</td>
              <td>{stats.draws}</td>
              <td>{stats.td}</td>
              <td>{stats.tdDiff}</td>
              <td>{stats.cas}</td>
              <td>{stats.casDiff}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}

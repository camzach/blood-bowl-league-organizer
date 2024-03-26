import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { db } from "utils/drizzle";
import { season } from "db/schema";
import { currentUser, RedirectToSignIn } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "League Table" };

async function getLeagueTable() {
  const user = await currentUser();
  if (!user) return <RedirectToSignIn />;

  const activeSeason = await db.query.season.findFirst({
    where: and(
      eq(season.leagueName, user.publicMetadata.league as string),
      eq(season.isActive, true),
    ),
    with: {
      roundRobinGames: {
        with: {
          game: {
            with: {
              homeDetails: { with: { team: { columns: { name: true } } } },
              awayDetails: { with: { team: { columns: { name: true } } } },
            },
          },
        },
      },
    },
  });

  if (!activeSeason) {
    return "No season currently active. Ask your league administrator when the next one begins!";
  }

  const games = activeSeason.roundRobinGames;

  const teams = new Set(
    games.flatMap(({ game: { homeDetails, awayDetails } }) => [
      homeDetails.team.name,
      awayDetails.team.name,
    ]),
  );

  const table = games.reduce(
    (prev, { game: { state, homeDetails, awayDetails } }) => {
      if (state !== "complete") return prev;
      const next = { ...prev };

      // Win / Loss / Draw
      if (homeDetails.touchdowns > awayDetails.touchdowns) {
        next[homeDetails.team.name].points += 3;
        next[homeDetails.team.name].wins += 1;
        next[awayDetails.team.name].losses += 1;
      }
      if (homeDetails.touchdowns < awayDetails.touchdowns) {
        next[awayDetails.team.name].points += 3;
        next[awayDetails.team.name].wins += 1;
        next[homeDetails.team.name].losses += 1;
      }
      if (homeDetails.touchdowns === awayDetails.touchdowns) {
        next[homeDetails.team.name].points += 1;
        next[awayDetails.team.name].points += 1;
        next[homeDetails.team.name].draws += 1;
        next[awayDetails.team.name].draws += 1;
      }

      // Casualties
      if (homeDetails.casualties >= 3) next[homeDetails.team.name].points += 1;
      if (awayDetails.casualties >= 3) next[awayDetails.team.name].points += 1;

      // Perfect Defense
      if (homeDetails.touchdowns === 0) next[awayDetails.team.name].points += 1;
      if (awayDetails.touchdowns === 0) next[homeDetails.team.name].points += 1;

      // Major Win
      if (homeDetails.touchdowns >= 3) next[homeDetails.team.name].points += 1;
      if (awayDetails.touchdowns >= 3) next[awayDetails.team.name].points += 1;

      // Stats
      next[homeDetails.team.name].td += homeDetails.touchdowns;
      next[awayDetails.team.name].td += awayDetails.touchdowns;
      next[homeDetails.team.name].cas += homeDetails.casualties;
      next[awayDetails.team.name].cas += awayDetails.casualties;
      next[homeDetails.team.name].tdDiff +=
        homeDetails.touchdowns - awayDetails.touchdowns;
      next[awayDetails.team.name].tdDiff +=
        awayDetails.touchdowns - homeDetails.touchdowns;
      next[homeDetails.team.name].casDiff +=
        homeDetails.casualties - awayDetails.casualties;
      next[awayDetails.team.name].casDiff +=
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
      ]),
    ),
  );
  return table;
}

export default async function Page() {
  const table = await getLeagueTable();

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

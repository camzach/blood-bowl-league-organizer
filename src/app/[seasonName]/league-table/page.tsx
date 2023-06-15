import { prisma } from "utils/prisma";
import type { Metadata } from "next";
import { GameState } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "League Table" };

async function getLeagueTable(seasonName: string) {
  const teams = await prisma.team.findMany({
    where: {
      OR: [
        {
          homeGames: {
            some: {
              RoundRobinRound: {
                RoundRobin: {
                  seasonName,
                },
              },
            },
          },
        },
        {
          awayGames: {
            some: {
              RoundRobinRound: {
                RoundRobin: {
                  seasonName,
                },
              },
            },
          },
        },
      ],
    },
  });

  const games = await prisma.game.findMany({
    where: {
      state: GameState.Complete,
      RoundRobinRound: {
        RoundRobin: {
          Season: {
            name: seasonName,
          },
        },
      },
    },
  });

  const table = games.reduce(
    (prev, game) => {
      const next = { ...prev };

      // Win / Loss / Draw
      if (game.touchdownsHome > game.touchdownsAway) {
        next[game.homeTeamName].points += 3;
        next[game.homeTeamName].wins += 1;
        next[game.awayTeamName].losses += 1;
      }
      if (game.touchdownsHome < game.touchdownsAway) {
        next[game.awayTeamName].points += 3;
        next[game.awayTeamName].wins += 1;
        next[game.homeTeamName].losses += 1;
      }
      if (game.touchdownsHome === game.touchdownsAway) {
        next[game.homeTeamName].points += 1;
        next[game.awayTeamName].points += 1;
        next[game.homeTeamName].draws += 1;
        next[game.awayTeamName].draws += 1;
      }

      // Casualties
      if (game.casualtiesHome >= 3) next[game.homeTeamName].points += 1;
      if (game.casualtiesAway >= 3) next[game.awayTeamName].points += 1;

      // Perfect Defense
      if (game.touchdownsHome === 0) next[game.awayTeamName].points += 1;
      if (game.touchdownsAway === 0) next[game.homeTeamName].points += 1;

      // Major Win
      if (game.touchdownsHome >= 3) next[game.homeTeamName].points += 1;
      if (game.touchdownsAway >= 3) next[game.awayTeamName].points += 1;

      // Stats
      next[game.homeTeamName].td += game.touchdownsHome;
      next[game.awayTeamName].td += game.touchdownsAway;
      next[game.homeTeamName].cas += game.casualtiesHome;
      next[game.awayTeamName].cas += game.casualtiesAway;
      next[game.homeTeamName].tdDiff +=
        game.touchdownsHome - game.touchdownsAway;
      next[game.awayTeamName].tdDiff +=
        game.touchdownsAway - game.touchdownsHome;
      next[game.homeTeamName].casDiff +=
        game.casualtiesHome - game.casualtiesAway;
      next[game.awayTeamName].casDiff +=
        game.casualtiesAway - game.casualtiesHome;

      return next;
    },
    Object.fromEntries(
      teams.map((team) => [
        team.name,
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

type Props = {
  params: {
    seasonName: string;
  };
};

export default async function Page({ params: { seasonName } }: Props) {
  const table = await getLeagueTable(decodeURIComponent(seasonName));
  return (
    <table className="table-zebra mx-auto table w-3/5">
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

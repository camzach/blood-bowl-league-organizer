import Link from "next/link";
import { Fragment } from "react";
import { prisma } from "utils/prisma";
import { GameState } from "@prisma/client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Schedule" };

type Props = {
  params: { seasonName: string };
};

export default async function Schedule({ params: { seasonName } }: Props) {
  const season = await prisma.season.findUniqueOrThrow({
    where: { name: decodeURIComponent(seasonName) },
    select: {
      RoundRobin: {
        select: {
          rounds: {
            select: {
              number: true,
              games: {
                select: {
                  id: true,
                  homeTeamName: true,
                  awayTeamName: true,
                  touchdownsHome: true,
                  touchdownsAway: true,
                  casualtiesHome: true,
                  casualtiesAway: true,
                  state: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!season.RoundRobin) return <>Season is not yet initialized</>;

  return (
    <table className="table-zebra table">
      <thead>
        <tr>
          <th>Round</th>
          <th>Home</th>
          <th>Away</th>
          <th>TD</th>
          <th>Cas</th>
          <th>Link</th>
        </tr>
      </thead>
      <tbody>
        {season.RoundRobin?.rounds.map((round) => (
          <Fragment key={round.number}>
            {round.games.map((game, gameIdx) => (
              <tr key={game.id}>
                {gameIdx === 0 && (
                  <td rowSpan={round.games.length}>{round.number}</td>
                )}
                <td>{game.homeTeamName}</td>
                <td>{game.awayTeamName}</td>
                <td>
                  {game.touchdownsHome} - {game.touchdownsAway}
                </td>
                <td>
                  {game.casualtiesHome} - {game.casualtiesAway}
                </td>
                <td>
                  <Link className="link" href={`/game/${game.id}`}>
                    {game.state === GameState.Complete ? "View Result" : "Play"}
                  </Link>
                </td>
              </tr>
            ))}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}

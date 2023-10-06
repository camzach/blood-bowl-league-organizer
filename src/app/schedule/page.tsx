import Link from "next/link";
import { Fragment } from "react";
import drizzle from "utils/drizzle";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { roundRobinGame } from "db/schema";

export const metadata: Metadata = { title: "Schedule" };

export default async function Schedule() {
  const games = await drizzle.query.roundRobinGame.findMany({
    where: eq(roundRobinGame.seasonName, process.env.ACTIVE_SEASON ?? ""),
    with: {
      game: { with: { homeDetails: true, awayDetails: true } },
    },
  });

  const rounds = games.reduce<(typeof games)[]>((prev, curr) => {
    if (!(curr.round - 1 in prev)) {
      prev[curr.round - 1] = [curr];
    } else {
      prev[curr.round - 1].push(curr);
    }
    return prev;
  }, []);

  return (
    <table className="table table-zebra">
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
        {rounds.map((round, roundIdx) => (
          <Fragment key={roundIdx}>
            {round.map(({ game }, gameIdx) => (
              <tr key={game.id}>
                {gameIdx === 0 && <td rowSpan={round.length}>{roundIdx}</td>}
                <td>{game.homeDetails.teamName}</td>
                <td>{game.awayDetails.teamName}</td>
                <td>
                  {game.homeDetails.touchdowns} - {game.awayDetails.touchdowns}
                </td>
                <td>
                  {game.homeDetails.casualties} - {game.awayDetails.casualties}
                </td>
                <td>
                  <Link className="link" href={`/game/${game.id}`}>
                    {game.state === "complete" ? "View Result" : "Play"}
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

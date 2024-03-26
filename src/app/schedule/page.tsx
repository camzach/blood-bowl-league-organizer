import Link from "next/link";
import { Fragment } from "react";
import { db } from "utils/drizzle";
import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { season } from "db/schema";
import { currentUser, RedirectToSignIn } from "@clerk/nextjs";

export const metadata: Metadata = { title: "Schedule" };

export default async function Schedule() {
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
                {gameIdx === 0 && (
                  <td rowSpan={round.length}>{roundIdx + 1}</td>
                )}
                <td>{game.homeDetails.team.name}</td>
                <td>{game.awayDetails.team.name}</td>
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

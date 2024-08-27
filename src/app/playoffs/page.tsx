import { currentUser } from "@clerk/nextjs/server";
import { bracketGame, season } from "db/schema";
import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "utils/drizzle";

async function getPlayoffsBracket(seasonId: string) {
  return db.query.bracketGame.findMany({
    where: eq(bracketGame.seasonId, seasonId),
    with: {
      game: {
        with: {
          homeDetails: { with: { team: { columns: { name: true } } } },
          awayDetails: { with: { team: { columns: { name: true } } } },
        },
      },
    },
  });
}

function buildGrid(numRounds: number) {
  const grid = [[`g-${numRounds}-1`]];
  for (let r = numRounds - 1; r > 0; r--) {
    const maxSeed = 2 ** (numRounds - r);
    if (maxSeed === 2) {
      grid.unshift([`g-${r}-1`]);
      grid.push([`g-${r}-2`]);
      continue;
    }
    for (let i = 0; i < grid.length; i++) {
      grid[i] = grid[i].flatMap((n) => [n, n]);
    }
    const [left, right] = Array(maxSeed / 2)
      .fill(0)
      .reduce<[number[], number[]]>(
        ([l, r], _, i) =>
          i % 2 === 0
            ? [[...l, i + 1, maxSeed - i], r]
            : [l, [...r, i + 1, maxSeed - i]],
        [[], []],
      );
    grid.unshift(left.map((n) => `g-${r}-${n}`));
    grid.push(right.map((n) => `g-${r}-${n}`));
  }
  return grid[0]
    .map((_, colIndex) => grid.map((row) => row[colIndex]))
    .map((row) => `'${row.join(" ")}'`)
    .join("\n");
}

export default async function Playoffs() {
  const user = await currentUser();
  if (!user?.publicMetadata.league) return notFound();
  const activeSeason = await db.query.season.findFirst({
    where: and(
      eq(season.leagueName, user.publicMetadata.league as string),
      eq(season.isActive, true),
    ),
  });
  if (!activeSeason) return notFound();

  const games = await getPlayoffsBracket(activeSeason.id);
  const rounds = games.reduce<(typeof games)[]>((prev, curr) => {
    if (!(curr.round - 1 in prev)) {
      prev[curr.round - 1] = [curr];
    } else {
      prev[curr.round - 1].push(curr);
    }
    return prev;
  }, []);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${(rounds.length - 1) * 2 + 1}, 1fr)`,
        gridTemplateRows: `repeat(${2 ** (rounds.length - 2)}, 1fr)`,
        gridTemplateAreas: buildGrid(rounds.length),
        gap: "0.5rem",
      }}
    >
      {rounds.flatMap((round) =>
        round.map((game) => {
          return (
            <div
              key={`${game.round}/${game.seed}`}
              className="grid place-items-center rounded-md border border-accent bg-base-300 leading-10 text-base-content"
              style={{
                gridArea: `g-${game.round}-${game.seed}`,
              }}
            >
              {game.game ? (
                <Link className="link" href={`/game/${game.game.id}`}>
                  {game.game.awayDetails?.team.name ?? "TBD"}
                  {" @ "}
                  {game.game.homeDetails?.team.name ?? "TBD"}
                </Link>
              ) : (
                <>TBD</>
              )}
            </div>
          );
        }),
      )}
    </div>
  );
}

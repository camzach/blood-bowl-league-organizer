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

function intersperse<T>(array: T[], value: T) {
  return array.flatMap((el) => [el, value]).slice(0, -1);
}

function buildGrid(numRounds: number) {
  const grid = [[{ r: 1, home: 1, away: 2 }]];
  for (let r = 2; r <= numRounds; r++) {
    const left: (typeof grid)[number] = [];
    for (const game of grid[0]) {
      left.push({
        r,
        home: game.home,
        away: Math.pow(2, r) - game.home + 1,
      });
      if (r > 2) {
        left.push({
          r,
          home: game.away,
          away: Math.pow(2, r) - game.away + 1,
        });
      }
    }
    grid.unshift(left);
    const right: (typeof grid)[number] = [];
    for (const game of grid[grid.length - 1]) {
      if (r > 2) {
        right.push({
          r,
          home: game.home,
          away: Math.pow(2, r) - game.home + 1,
        });
      }
      right.push({
        r,
        home: game.away,
        away: Math.pow(2, r) - game.away + 1,
      });
    }
    grid.push(right);
  }

  const cssGrid = grid.map((round, i) => {
    const roundNum = numRounds - Math.abs(i - (numRounds - 1));
    const blockHeight =
      roundNum === numRounds
        ? grid[0].length * 2 + 1
        : Math.pow(2, roundNum) - 1;

    const row = intersperse(
      round.map((g) => Array(blockHeight).fill(`g-${g.r}-${g.home}`)),
      ["."],
    ).flat();
    if (roundNum !== numRounds) {
      row.push(".");
      row.unshift(".");
    }
    return row;
  });

  const transposed = cssGrid[0].map((_, colIndex) =>
    cssGrid.map((row) => row[colIndex]),
  );
  return transposed
    .map((row) => '"' + row.map((cell) => cell).join(" ") + '"')
    .join(" ");
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
        gridTemplateRows: `repeat(${Math.pow(2, rounds.length - 1) + 1}, 1fr)`,
        gridTemplateAreas: buildGrid(rounds.length),
      }}
      className="mx-auto grid max-h-full w-3/4 gap-6"
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

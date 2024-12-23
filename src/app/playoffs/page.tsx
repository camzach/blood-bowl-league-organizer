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

function gradient(round: number, totalRounds: number) {
  const green = { l: 46, c: 72, h: 136 };
  const yellow = { l: 97, c: 97, h: 103 };
  const red = { l: 53, c: 105, h: 40 };

  if (round / totalRounds < 0.5) {
    const percentage = round / (totalRounds / 2);
    const l = (red.l - yellow.l) * percentage + yellow.l;
    const c = (red.c - yellow.c) * percentage + yellow.c;
    const h = (red.h - yellow.h) * percentage + yellow.h;
    return `lch(${l} ${c} ${h})`;
  } else {
    const percentage = (round - totalRounds / 2) / totalRounds / 2;
    const l = (yellow.l - green.l) * percentage + green.l;
    const c = (yellow.c - green.c) * percentage + green.c;
    const h = (yellow.h - green.h) * percentage + green.h;
    return `lch(${l} ${c} ${h})`;
  }
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
              className="grid place-items-center rounded-md border bg-base-300 leading-10 text-base-content"
              style={{
                gridArea: `g-${game.round}-${game.seed}`,
                borderColor: gradient(game.round - 1, rounds.length - 1),
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

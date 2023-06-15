import Link from "next/link";
import { prisma } from "utils/prisma";

async function getPlayoffsBracket(seasonName: string) {
  return prisma.bracket.findUniqueOrThrow({
    where: { seasonName },
    include: {
      Round: {
        include: {
          BracketGame: {
            include: {
              game: {
                select: { homeTeamName: true, awayTeamName: true, id: true },
              },
            },
          },
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
        [[], []]
      );
    grid.unshift(left.map((n) => `g-${r}-${n}`));
    grid.push(right.map((n) => `g-${r}-${n}`));
  }
  return grid[0]
    .map((_, colIndex) => grid.map((row) => row[colIndex]))
    .map((row) => `'${row.join(" ")}'`)
    .join("\n");
}

type Props = {
  params: { seasonName: string };
};

export default async function Playoffs({ params: { seasonName } }: Props) {
  const bracket = await getPlayoffsBracket(decodeURIComponent(seasonName));

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${bracket.Round.length * 2 - 1}, auto)`,
        gridTemplateRows: `repeat(${2 ** (bracket.Round.length - 2)}, auto)`,
        gridTemplateAreas: buildGrid(bracket.Round.length),
        gap: "0.5rem",
      }}
    >
      {bracket.Round.flatMap((round) =>
        round.BracketGame.map((game) => {
          return (
            <div
              key={`${round.id}/${game.id}`}
              className="grid place-items-center rounded-md border border-accent bg-base-300 leading-10 text-base-content"
              style={{
                gridArea: `g-${round.number}-${game.seed}`,
              }}
            >
              {game.game ? (
                <Link className="link" href={`/game/${game.game.id}`}>
                  {game.game.awayTeamName} @ {game.game.homeTeamName}
                </Link>
              ) : (
                <>TBD</>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

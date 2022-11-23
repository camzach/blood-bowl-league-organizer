import Link from 'next/link';
import type { ReactElement } from 'react';
import { prisma } from 'utils/prisma';
import styles from './styles.module.scss';

export default async function Schedule(): Promise<ReactElement> {
  const games = (await prisma.game.findMany({
    select: {
      id: true,
      round: true,
      homeTeamName: true,
      awayTeamName: true,
    },
  }));
  const rounds = games.reduce<Array<Array<typeof games[number]>>>((acc, curr) => {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    acc[curr.round] = acc[curr.round] ? [...acc[curr.round], curr] : [curr];
    return acc;
  }, []);

  return (
    <ol className={styles.list}>
      {rounds.map((round, idx) => (
        <li key={idx}>
          <ol>
            {round.sort((a, b) => a.homeTeamName.localeCompare(b.homeTeamName)).map(game => (
              <li key={game.id}>
                <Link href={{ pathname: `/game/${game.id}` }}>
                  {`${game.homeTeamName} - ${game.awayTeamName}`}
                </Link>
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ol>
  );
}

import Link from 'next/link';
import type { ReactNode } from 'react';
import { trpc } from 'utils/trpc';
import styles from './styles.module.scss';

export default async function Schedule(): Promise<ReactNode> {
  const data = await trpc.game.list.query();

  return (
    <ol className={styles.list}>
      {data.map((round, idx) => (
        <li key={idx}>
          <ol>
            {round.map(game => (
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

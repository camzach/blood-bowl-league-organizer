'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from 'utils/trpc';
import styles from './styles.module.scss';

let gamesPromise = trpc.game.list.query();

export default function Schedule(): ReactNode {
  const data = use(gamesPromise);
  const router = useRouter();

  return (
    <>
      <button
        onClick={(): void => {
          void trpc.schedule.generate.mutate()
            .then(() => {
              gamesPromise = trpc.game.list.query();
            })
            .then(() => {
              router.refresh();
            });
        }}
      >
        Generate
      </button>
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
    </>
  );
}

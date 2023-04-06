import Link from 'next/link';
import type { ReactElement } from 'react';
import { Fragment } from 'react';
import { prisma } from 'utils/prisma';
import styles from './styles.module.scss';
import cx from 'classnames';
import { GameState } from '@prisma/client/edge';

export default async function Schedule(): Promise<ReactElement> {
  const games = (await prisma.game.findMany({
    select: {
      id: true,
      round: true,
      homeTeamName: true,
      awayTeamName: true,
      touchdownsHome: true,
      touchdownsAway: true,
      casualtiesHome: true,
      casualtiesAway: true,
      state: true,
    },
  }));
  const rounds = games.reduce<Array<Array<typeof games[number]>>>((acc, curr) => {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    acc[curr.round] = acc[curr.round] ? [...acc[curr.round], curr] : [curr];
    return acc;
  }, []);

  return (
    <table className={styles.table}>
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
        {rounds.map((round, roundIdx) => <Fragment key={roundIdx}>
          {round.map((game, gameIdx) =>
            <tr key={game.id} className={cx(gameIdx === 0 && styles['bordered-row'])}>
              {gameIdx === 0 && <td rowSpan={round.length}>{roundIdx + 1}</td>}
              <td>{game.homeTeamName}</td>
              <td>{game.awayTeamName}</td>
              <td>{game.touchdownsHome} - {game.touchdownsAway}</td>
              <td>{game.casualtiesHome} - {game.casualtiesAway}</td>
              <td><Link href={`/game/${game.id}`}>
                {game.state === GameState.Complete ? 'View Result' : 'Play'}
              </Link></td>
            </tr>)}
        </Fragment>)}
      </tbody>
    </table>
  );
}

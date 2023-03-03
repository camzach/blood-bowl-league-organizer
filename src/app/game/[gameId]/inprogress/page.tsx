import { Prisma } from '@prisma/client';
import { TeamTable } from 'components/team-table';
import type { ComponentProps, ReactElement } from 'react';
import { prisma } from 'utils/prisma';
import styles from './styles.module.scss';
import TeamArgs = Prisma.TeamArgs;
import PlayerFindManyArgs = Prisma.PlayerFindManyArgs;
import ScoreWidget from './score-widget';
import { notFound } from 'next/navigation';

type Props = {
  params: { gameId: string };
};

const playerSelect = {
  where: { missNextGame: false },
  include: { skills: true, position: true },
} satisfies PlayerFindManyArgs;

const teamSelect = {
  select: {
    players: playerSelect,
    journeymen: playerSelect,
  },
} satisfies TeamArgs;
const cols = [
  '#',
  'Name',
  'Position',
  'Skills',
  'MA',
  'ST',
  'AV',
  'AG',
  'PA',
  'NI',
] satisfies ComponentProps<typeof TeamTable>['cols'];

export default async function InProgress({ params: { gameId } }: Props): Promise<ReactElement> {
  const game = await prisma.game.findUnique({
    where: { id: decodeURIComponent(gameId) },
    select: {
      home: teamSelect,
      away: teamSelect,
    },
  });
  if (!game)
    return notFound();

  return <div className={styles.layout}>
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <TeamTable
        players={game.home.players}
        cols={cols}
      />
      {game.home.journeymen.length > 0 &&
        <TeamTable
          players={game.home.journeymen}
          cols={cols}
        />
      }
    </div>
    <ScoreWidget
      gameId={gameId}
      home={{
        players: game.home.players.sort((a, b) => a.number - b.number),
        journeymen: game.home.journeymen.sort((a, b) => a.number - b.number),
      }}
      away={{
        players: game.away.players.sort((a, b) => a.number - b.number),
        journeymen: game.away.journeymen.sort((a, b) => a.number - b.number),
      }}
    />
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <TeamTable
        players={game.away.players}
        cols={cols}
      />
      {game.away.journeymen.length > 0 &&
        <TeamTable
          players={game.away.journeymen}
          cols={cols}
        />
      }
    </div>
  </div>;
}

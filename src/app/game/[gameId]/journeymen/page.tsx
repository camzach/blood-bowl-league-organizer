import { Prisma } from '@prisma/client';
import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { prisma } from 'utils/prisma';
import Content from './content';
import TeamArgs = Prisma.TeamArgs;

const teamFields = {
  select: {
    name: true,
    _count: { select: { players: { where: { missNextGame: false } } } },
    roster: {
      select: {
        positions: {
          select: { id: true, name: true },
          where: { max: { gte: 12 } },
        },
      },
    },
  },
} satisfies TeamArgs;

type Props = {
  params: { gameId: string };
};

export default async function Journeymen({ params: { gameId } }: Props): Promise<ReactElement> {
  const game = await prisma.game.findUniqueOrThrow({
    where: { id: gameId },
    select: {
      home: teamFields,
      away: teamFields,
      state: true,
    },
  });

  if (game.state !== 'Journeymen')
    redirect(`game/${gameId}/${game.state.toLowerCase()}`);

  return (
    <Content
      gameId={gameId}
      home={{
        name: game.home.name,
        choices: game.home.roster.positions,
        // eslint-disable-next-line no-underscore-dangle
        needed: Math.max(0, 11 - game.home._count.players),
      }}
      away={{
        name: game.away.name,
        choices: game.away.roster.positions,
        // eslint-disable-next-line no-underscore-dangle
        needed: Math.max(0, 11 - game.away._count.players),
      }}
    />
  );
}
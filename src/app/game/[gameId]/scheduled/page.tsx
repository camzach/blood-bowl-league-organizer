import type { ReactElement } from 'react';
import { prisma } from 'utils/prisma';
import { PlayButton } from './play-button';
import { redirect } from 'next/navigation';

export default async function Game({ params: { gameId } }: { params: { gameId: string } }): Promise<ReactElement> {
  const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });

  if (game.state !== 'Scheduled')
    redirect(`game/${gameId}/${game.state.toLowerCase()}`);

  return <PlayButton gameId={gameId} />;
}

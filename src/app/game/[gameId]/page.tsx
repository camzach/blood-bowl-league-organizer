import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { prisma } from 'utils/prisma';

export default async function Game({ params: { gameId } }: { params: { gameId: string } }): Promise<ReactNode> {
  const data = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });

  if (data.state !== 'Complete')
    redirect(`/game/${gameId}/${data.state.toLowerCase()}`);

  return <>Game ID: {gameId}</>;
}

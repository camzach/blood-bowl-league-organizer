import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { trpc } from 'utils/trpc';
import Content from './content';

export default async function Journeymen({ params: { gameId } }: { params: { gameId: string } }): Promise<ReactNode> {
  const game = await trpc.game.get.query(gameId);

  if (game.state !== 'Journeymen')
    redirect(`game/${gameId}/${game.state.toLowerCase()}`);

  return (
    <Content game={game} />
  );
}

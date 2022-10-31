import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { trpc } from '../../../utils/trpc';

export default async function Game({ params: { gameId } }: { params: { gameId: string } }): Promise<ReactNode> {
  const data = await trpc.game.get.query(gameId);

  if (data.state !== 'Complete') {
    redirect(`/game/${gameId}/${data.state.toLowerCase()}`);
    return <>Redirect</>;
  }

  return <>Game ID: {gameId}</>;
}

import type { ReactElement } from 'react';
import { trpc } from 'utils/trpc';
import { PlayButton } from './play-button';
import { redirect } from 'next/navigation';

export default async function Game({ params: { gameId } }: { params: { gameId: string } }): Promise<ReactElement> {
  const game = await trpc.game.get.query(gameId);

  if (game.state !== 'Scheduled')
    redirect(`game/${gameId}/${game.state.toLowerCase()}`);

  return <PlayButton game={game} />;
}

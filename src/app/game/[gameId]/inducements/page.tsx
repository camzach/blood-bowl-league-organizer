import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { trpc } from 'utils/trpc';
import Content from './content';

type InducementsResponseType = ReturnType<typeof trpc.inducements.list.query>;

export default async function Inducements({ params: { gameId } }: { params: { gameId: string } }): Promise<ReactNode> {
  const game = await trpc.game.get.query(gameId);

  if (game.state !== 'Inducements')
    redirect(`game/${gameId}/${game.state.toLowerCase()}`);

  const inducements = await Promise.all([game.homeTeam, game.awayTeam]
    .map(async team => trpc.inducements.list.query({ team })) as [InducementsResponseType, InducementsResponseType]);

  return <Content inducements={inducements} gameId={game.id} />;
}

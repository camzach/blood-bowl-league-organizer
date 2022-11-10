import type { ReactNode } from 'react';
import { trpc } from 'utils/trpc';
import Content from './content';

export default async function Inducements({ params: { gameId } }: { params: { gameId: string } }): Promise<ReactNode> {
  const inducements = await trpc.inducements.list.query({ team: 'Team A' });

  return <Content inducements={inducements} />;
}

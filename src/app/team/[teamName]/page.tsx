import type { ReactNode } from 'react';
import { trpc } from '../../../utils/trpc';

export default async function TeamPage({ params: { teamName } }: { params: { teamName: string } }): Promise<ReactNode> {
  const data = await trpc.team.get.query(teamName);

  return (
    <div>
      <p>{JSON.stringify(data)}</p>
    </div>
  );
}

import type { ReactElement } from 'react';
import { trpc } from '../utils/trpc';

export default function IndexPage(): ReactElement {
  const hello = trpc.team.get.useQuery('Team A');
  if (!hello.data)
    return <div>Loading...</div>;

  return (
    <div>
      <p>{hello.data.rosterName}</p>
    </div>
  );
}

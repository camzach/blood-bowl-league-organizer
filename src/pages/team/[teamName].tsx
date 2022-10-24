import type { ReactElement } from 'react';
import { useRouter } from 'next/router';
import { trpc } from '../../utils/trpc';

export default function TeamPage(): ReactElement {
  const router = useRouter<'/team/[teamName]'>();

  const { isLoading, isError, data } = trpc.team.get.useQuery(router.query.teamName, { retry: false });

  if (isLoading)
    return <div>Loading...</div>;

  if (isError)
    return <div>Error!</div>;

  return (
    <div>
      <p>{JSON.stringify(data)}</p>
    </div>
  );
}

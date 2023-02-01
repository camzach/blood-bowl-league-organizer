'use client';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { trpc } from 'utils/trpc';

type Props = {
  team: string;
};

export default function ReadyButton({ team }: Props): ReactElement {
  const router = useRouter();
  const readyTeam = (): void => {
    void trpc.team.ready.mutate(team).then(() => {
      router.refresh();
    });
  };
  return <button onClick={readyTeam}>Ready for next game</button>;
}

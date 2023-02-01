'use client';
import type { ReactElement } from 'react';
import { trpc } from 'utils/trpc';
import useServerMutation from 'utils/use-server-mutation';

type Props = {
  player: string;
  number: number;
  team: string;
};

export default function PlayerFirer({ player, number, team }: Props): ReactElement {
  const { startMutation, endMutation, isMutating } = useServerMutation();

  const handleHire = (): void => {
    startMutation();
    void trpc.team.hireJourneyman.mutate({ player, number, team })
      .then(endMutation);
  };

  return isMutating ? <>Hiring...</> : <button type="button" onClick={handleHire}>Hire!</button>;
}



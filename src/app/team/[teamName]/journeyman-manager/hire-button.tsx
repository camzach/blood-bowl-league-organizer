'use client';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { trpc } from 'utils/trpc';
import useServerMutation from 'utils/use-server-mutation';

type Props = {
  player: string;
  number: number;
  team: string;
};

export default function PlayerFirer({ player, number, team }: Props): ReactElement {
  const { startMutation, endMutation, isMutating } = useServerMutation();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (error && !isMutating) {
      const timeout = setTimeout(() => {
        setError(false);
      }, 1500);
      return () => {
        clearTimeout(timeout);
      };
    }
    return () => {};
  }, [error, isMutating]);


  const handleHire = (): void => {
    startMutation();
    void trpc.team.hireJourneyman.mutate({ player, number, team })
      .catch(() => { setError(true); })
      .finally(endMutation);
  };
  if (isMutating)
    return <>Hiring...</>;

  if (error)
    return <>Failed to hire. Please try again</>;

  return <button type="button" onClick={handleHire}>Hire!</button>;
}



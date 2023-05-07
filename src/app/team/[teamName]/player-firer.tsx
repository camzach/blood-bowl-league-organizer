'use client';
import Button from 'components/button';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { trpc } from 'utils/trpc';
import useServerMutation from 'utils/use-server-mutation';

type Props = {
  playerId: string;
};

export default function PlayerFirer({ playerId }: Props): ReactElement {
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
  }, [error, isMutating]);

  const handleFire = (): void => {
    startMutation();
    void trpc.player.fire.mutate(playerId)
      .catch(() => { setError(true); })
      .finally(endMutation);
  };

  if (isMutating)
    return <>Firing...</>;

  if (error)
    return <>Failed to fire player</>;

  return <Button type="button" onClick={handleFire}>Fire!</Button>;
}

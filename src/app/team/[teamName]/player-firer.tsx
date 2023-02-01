'use client';
import type { ReactElement } from 'react';
import { trpc } from 'utils/trpc';
import useServerMutation from 'utils/use-server-mutation';

type Props = {
  playerId: string;
};

export default function PlayerFirer({ playerId }: Props): ReactElement {
  const { startMutation, endMutation, isMutating } = useServerMutation();

  const handleFire = (): void => {
    startMutation();
    void trpc.player.fire.mutate(playerId)
      .then(endMutation);
  };

  return isMutating ? <>Firing...</> : <button type="button" onClick={handleFire}>Fire!</button>;
}

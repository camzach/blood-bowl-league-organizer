import type { ReactElement } from 'react';
import { trpc } from 'utils/trpc';
import useServerMutation from 'utils/use-server-mutation';

type Props = {
  id: string;
  name: string | null;
};

export default function PlayerNameEditor({ name: playerName, id }: Props): ReactElement {
  const { startMutation, endMutation, isMutating } = useServerMutation();
  const handleNameChange = (newName: string): void => {
    if (newName === playerName || newName === '') return;
    startMutation();
    void trpc.player.update.mutate({ player: id, name: newName }).then(endMutation);
  };

  if (isMutating) return <>Updating...</>;

  return <input
    defaultValue={playerName ?? ''}
    onBlur={(e): void => {
      handleNameChange(e.target.value);
    }}
  />;
}

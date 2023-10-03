"use client";
import useServerMutation from "utils/use-server-mutation";
import type { update } from "../actions";

type Props = {
  id: string;
  name: string | null;
  update: typeof update;
};

export default function PlayerNameEditor({
  name: playerName,
  id,
  update,
}: Props) {
  const { startMutation, isMutating } = useServerMutation();
  const handleNameChange = (newName: string): void => {
    if (newName === playerName || newName === "") return;
    startMutation(() => update({ player: id, name: newName }));
  };

  if (isMutating) return <>Updating...</>;

  return (
    <input
      className="input-bordered input input-sm"
      defaultValue={playerName ?? ""}
      onBlur={(e): void => {
        handleNameChange(e.target.value);
      }}
    />
  );
}

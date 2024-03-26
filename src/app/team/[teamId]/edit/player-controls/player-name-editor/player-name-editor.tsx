"use client";
import useRefreshingAction from "utils/use-refreshing-action";
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
  const { execute, status } = useRefreshingAction(update);
  const handleNameChange = (newName: string): void => {
    if (newName === playerName || newName === "") return;
    execute({ player: id, name: newName });
  };

  if (status === "executing") return <>Updating...</>;

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

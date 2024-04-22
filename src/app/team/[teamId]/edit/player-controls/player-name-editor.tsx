"use client";
import useRefreshingAction from "utils/use-refreshing-action";
import { update } from "./actions";
import { useState } from "react";

type Props = {
  id: string;
  name: string | null;
};

export default function PlayerNameEditor({ name: playerName, id }: Props) {
  const { execute, status } = useRefreshingAction(update);
  const [localName, setLocalName] = useState(playerName ?? "");
  const submitName = () => {
    if (localName === playerName || localName === "") return;
    execute({ player: id, name: localName });
  };

  if (status === "executing") return <>Updating...</>;

  return (
    <input
      className="input input-sm input-bordered"
      value={localName}
      onChange={(e): void => {
        setLocalName(e.target.value);
      }}
      onBlur={submitName}
    />
  );
}

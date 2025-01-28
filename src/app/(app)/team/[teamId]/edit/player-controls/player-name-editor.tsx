"use client";
import { useRouter } from "next/navigation";
import { update } from "./actions";
import { useState } from "react";
import { useAction } from "next-safe-action/hooks";

type Props = {
  id: string;
  name: string | null;
};

export default function PlayerNameEditor({ name: playerName, id }: Props) {
  const router = useRouter();
  const { execute, status } = useAction(update, {
    onSuccess() {
      router.refresh();
    },
  });

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

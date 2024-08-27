"use client";
import { useRouter } from "next/navigation";
import { fire } from "./actions";
import { useAction } from "next-safe-action/hooks";

type Props = {
  id: string;
};

export default function PlayerFirer({ id }: Props) {
  const router = useRouter();
  const { execute, status } = useAction(fire, {
    onSuccess() {
      router.refresh();
    },
  });

  if (status === "executing") return <>Firing...</>;

  if (status === "hasErrored") return <>Failed to fire player</>;

  return (
    <button
      className="btn btn-outline btn-secondary btn-sm"
      onClick={() => execute({ playerId: id })}
    >
      Fire!
    </button>
  );
}

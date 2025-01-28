"use client";
import { useAction } from "next-safe-action/hooks";
import { hireExistingPlayer } from "../actions";
import { useRouter } from "next/navigation";

type Props = {
  player: string;
  number: number;
};

export default function PlayerHirer({ player, number }: Props) {
  const router = useRouter();
  const { execute, status } = useAction(hireExistingPlayer, {
    onSuccess() {
      router.refresh();
    },
  });

  if (status === "executing") return <>Hiring...</>;

  if (status === "hasErrored") return <>Failed to hire. Please try again</>;

  return (
    <button
      className="btn-bordered btn btn-primary btn-sm"
      onClick={() => {
        execute({ player, number });
      }}
    >
      Hire!
    </button>
  );
}

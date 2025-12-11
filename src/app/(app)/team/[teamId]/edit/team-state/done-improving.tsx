"use client";
import { useRouter } from "next/navigation";
import { doneImproving } from "../actions";
import { useAction } from "next-safe-action/hooks";

type Props = {
  teamId: string;
  blocked: boolean;
};

export default function ReadyButton({ teamId, blocked = false }: Props) {
  const router = useRouter();
  const { execute, status } = useAction(doneImproving, {
    onSuccess() {
      router.refresh();
    },
  });

  return status === "executing" ? (
    "Submitting..."
  ) : (
    <button
      className="btn btn-primary"
      disabled={blocked}
      onClick={() => execute(teamId)}
    >
      Done improving players
    </button>
  );
}

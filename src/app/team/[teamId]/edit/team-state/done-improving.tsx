"use client";
import { useRouter } from "next/navigation";
import { doneImproving } from "../actions";
import { useAction } from "next-safe-action/hooks";

type Props = {
  teamId: string;
};

export default function ReadyButton({ teamId }: Props) {
  const router = useRouter();
  const { execute, status } = useAction(doneImproving, {
    onSuccess() {
      router.refresh();
    },
  });

  return status === "executing" ? (
    "Submitting..."
  ) : (
    <button className="btn btn-primary" onClick={() => execute(teamId)}>
      Done improving players
    </button>
  );
}

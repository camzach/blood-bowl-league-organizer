"use client";
import { doneImproving } from "../actions";
import useRefreshingAction from "utils/use-refreshing-action";

type Props = {
  teamId: string;
};

export default function ReadyButton({ teamId }: Props) {
  const { execute, status } = useRefreshingAction(doneImproving);

  return status === "executing" ? (
    "Submitting..."
  ) : (
    <button className="btn" onClick={() => execute(teamId)}>
      Done improving players
    </button>
  );
}

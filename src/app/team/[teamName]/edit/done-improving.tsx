"use client";
import { doneImproving } from "./actions";
import useRefreshingAction from "utils/use-refreshing-action";

type Props = {
  team: string;
};

export default function ReadyButton({ team }: Props) {
  const { execute, status } = useRefreshingAction(doneImproving);

  return status === "executing" ? (
    "Submitting..."
  ) : (
    <button className="btn" onClick={() => execute(team)}>
      Done improving players
    </button>
  );
}

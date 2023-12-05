"use client";
import { hireExistingPlayer } from "../actions";
import useRefreshingAction from "utils/use-refreshing-action";

type Props = {
  player: string;
  number: number;
};

export default function PlayerHirer({ player, number }: Props) {
  const { execute, status } = useRefreshingAction(hireExistingPlayer);

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

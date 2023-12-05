"use client";
import { fire } from "./actions";
import useRefreshingAction from "utils/use-refreshing-action";

type Props = {
  id: string;
};

export default function PlayerFirer({ id }: Props) {
  const { execute, status } = useRefreshingAction(fire);

  if (status === "executing") return <>Firing...</>;

  if (status === "hasErrored") return <>Failed to fire player</>;

  return (
    <button
      className="btn btn-secondary btn-outline btn-sm"
      onClick={() => execute({ playerId: id })}
    >
      Fire!
    </button>
  );
}

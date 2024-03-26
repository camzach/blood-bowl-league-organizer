"use client";
import { update } from "./actions";
import useRefreshingAction from "utils/use-refreshing-action";

type Props = {
  id: string;
  number: number;
};

export default function PlayerNumberSelector({ id, number }: Props) {
  const { execute, status } = useRefreshingAction(update);

  if (status === "executing") return <>Updating...</>;

  return (
    <select
      className="select-bordered select select-sm"
      value={number}
      onChange={(e): void => {
        execute({ player: id, number: parseInt(e.target.value, 10) });
      }}
    >
      {Array.from(Array(16), (_, idx) => (
        <option key={idx} value={idx + 1}>
          {idx + 1}
        </option>
      ))}
    </select>
  );
}

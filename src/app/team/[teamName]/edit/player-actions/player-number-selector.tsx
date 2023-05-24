"use client";
import { update } from "actions/player";
import useServerMutation from "utils/use-server-mutation";

type Props = {
  id: string;
  number: number;
};

export default function PlayerNumberSelector({ id, number }: Props) {
  const { startMutation, isMutating } = useServerMutation();
  const handleNumberChange = (newNumber: number): void => {
    startMutation(() => update({ player: id, number: newNumber }));
  };

  if (isMutating) return <>Updating...</>;

  return (
    <select
      className="select-bordered select select-sm"
      value={number}
      onChange={(e): void => {
        handleNumberChange(parseInt(e.target.value, 10));
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

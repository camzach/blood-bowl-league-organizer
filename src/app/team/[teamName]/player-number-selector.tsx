import type { ReactElement } from "react";
import { trpc } from "utils/trpc";
import useServerMutation from "utils/use-server-mutation";

type Props = {
  id: string;
  number: number;
};

export default function PlayerNumberSelector({
  id,
  number,
}: Props): ReactElement {
  const { startMutation, endMutation, isMutating } = useServerMutation();
  const handleNumberChange = (newNumber: number): void => {
    startMutation();
    void trpc.player.update
      .mutate({ player: id, number: newNumber })
      .then(endMutation);
  };

  if (isMutating) return <>Updating...</>;

  return (
    <select
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

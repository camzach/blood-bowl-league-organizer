"use client";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { hirePlayer } from "./actions";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";

type Props = {
  positions: Array<{ name: string; cost: number }>;
  treasury: number;
  freeNumbers: number[];
  teamId: string;
  disabled?: boolean;
};

export function PlayerHirer({
  positions,
  treasury,
  freeNumbers,
  teamId,
  disabled = false,
}: Props) {
  const router = useRouter();
  const [position, setPosition] = useState(positions[0]?.name ?? "");
  const [number, setNumber] = useState(freeNumbers[0] ?? 0);
  const { execute, status } = useAction(hirePlayer, {
    onSuccess() {
      router.refresh();
    },
  });

  useEffect(() => {
    if (freeNumbers.length > 0 && !freeNumbers.includes(number)) {
      setNumber(freeNumbers[0]);
    }
  }, [freeNumbers, number]);

  useEffect(() => {
    if (!positions.some((pos) => pos.name === position))
      setPosition(positions[0]?.name);
  }, [position, positions]);

  const handlePositionSelect = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      setPosition(e.target.value);
    },
    [],
  );

  const handleNumberSelect = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const val = parseInt(e.target.value, 10);
      if (Number.isNaN(val)) return;
      setNumber(val);
    },
    [],
  );

  if (status === "executing") return <>Hiring...</>;

  if (status === "hasErrored") return <>An error occurred. Try again.</>;

  return (
    <div className="join">
      <select
        className="join-item select select-bordered"
        value={position}
        onChange={handlePositionSelect}
        disabled={disabled}
      >
        {positions.map((p) => (
          <option disabled={p.cost > treasury} key={p.name} value={p.name}>
            {p.name} - {p.cost}
          </option>
        ))}
      </select>
      <select
        className="join-item select select-bordered"
        value={number}
        onChange={handleNumberSelect}
        disabled={disabled}
      >
        {freeNumbers.map((n) => (
          <option key={n}>{n}</option>
        ))}
      </select>
      <button
        className="btn btn-primary join-item"
        onClick={() => execute({ number, teamId, position })}
        disabled={disabled}
      >
        HIRE!!!
      </button>
    </div>
  );
}

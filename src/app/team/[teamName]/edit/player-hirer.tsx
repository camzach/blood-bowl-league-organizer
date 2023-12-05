"use client";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { hirePlayer } from "./actions";
import useRefreshingAction from "utils/use-refreshing-action";

type Props = {
  positions: Array<{ name: string; cost: number }>;
  treasury: number;
  freeNumbers: number[];
  teamName: string;
};

export function PlayerHirer({
  positions,
  treasury,
  freeNumbers,
  teamName,
}: Props) {
  const [position, setPosition] = useState(positions[0].name);
  const [number, setNumber] = useState(freeNumbers[0]);
  const { execute, status } = useRefreshingAction(hirePlayer);

  useEffect(() => {
    if (!freeNumbers.includes(number)) {
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
        className="select-bordered select join-item"
        value={position}
        onChange={handlePositionSelect}
      >
        {positions.map((p) => (
          <option disabled={p.cost > treasury} key={p.name} value={p.name}>
            {p.name} - {p.cost}
          </option>
        ))}
      </select>
      <select
        className="select-bordered select join-item"
        value={number}
        onChange={handleNumberSelect}
      >
        {freeNumbers.map((n) => (
          <option key={n}>{n}</option>
        ))}
      </select>
      <button
        className="btn-primary join-item btn"
        onClick={() => execute({ number, team: teamName, position })}
      >
        HIRE!!!
      </button>
    </div>
  );
}

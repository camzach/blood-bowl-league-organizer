"use client";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import type { Position } from "@prisma/client";
import { hirePlayer as hirePlayerAction } from "./actions";
import useServerMutation from "utils/use-server-mutation";

type Props = {
  positions: Position[];
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
  const { startMutation, isMutating } = useServerMutation();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!positions.some((pos) => pos.name === position))
      setPosition(positions[0]?.name);
  }, [position, positions]);

  useEffect(() => {
    if (error && !isMutating) {
      const timeout = setTimeout(() => {
        setError(false);
      }, 1500);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [error, isMutating]);

  const handlePositionSelect = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      setPosition(e.target.value);
    },
    []
  );

  const handleNumberSelect = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const val = parseInt(e.target.value, 10);
      if (Number.isNaN(val)) return;
      setNumber(val);
    },
    []
  );

  const hirePlayer = (): void => {
    startMutation(async () => {
      try {
        await hirePlayerAction({ team: teamName, position, number });
        setNumber(freeNumbers.find((n) => n !== number) ?? freeNumbers[0]);
      } catch {
        setError(true);
      }
    });
  };

  if (isMutating) return <>Hiring...</>;

  if (error) return <>An error occurred. Try again.</>;

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
      <button className="btn-primary join-item btn" onClick={hirePlayer}>
        HIRE!!!
      </button>
    </div>
  );
}

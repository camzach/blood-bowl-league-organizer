'use client';
import React, { useEffect, useState } from 'react';
import type { Position } from '@prisma/client/edge';
import { trpc } from 'utils/trpc';
import useServerMutation from 'utils/use-server-mutation';

type Props = {
  positions: Position[];
  treasury: number;
  freeNumbers: number[];
  teamName: string;
};

export function PlayerHirer({ positions, treasury, freeNumbers, teamName }: Props): React.ReactElement {
  const [position, setPosition] = useState(positions[0].name);
  const [number, setNumber] = useState(freeNumbers[0]);
  const { startMutation, endMutation, isMutating } = useServerMutation();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!positions.some(pos => pos.name === position))
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
    return () => {};
  }, [error, isMutating]);

  const handlePositionSelect = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setPosition(e.target.value);
  }, []);

  const handleNumberSelect = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = parseInt(e.target.value, 10);
    if (Number.isNaN(val)) return;
    setNumber(val);
  }, []);

  const hirePlayer = (): void => {
    startMutation();
    void trpc.team.hirePlayer.mutate({ team: teamName, position, number })
      .then(() => {
        setNumber(freeNumbers.find(n => n !== number) ?? freeNumbers[0]);
      })
      .catch(() => {
        setError(true);
      })
      .finally(endMutation);
  };

  if (isMutating)
    return <>Hiring...</>;

  if (error)
    return <>An error occurred. Try again.</>;

  return (
    <>
      <select value={position} onChange={handlePositionSelect}>
        {positions.map(p => (
          <option
            disabled={p.cost > treasury}
            key={p.name}
            value={p.name}
          >
            {p.name} - {p.cost}
          </option>
        ))}
      </select>
      <select value={number} onChange={handleNumberSelect}>
        {freeNumbers.map(n => (
          <option key={n}>
            {n}
          </option>
        ))}
      </select>
      <button type="button" onClick={hirePlayer}>HIRE!!!</button>
    </>
  );
}

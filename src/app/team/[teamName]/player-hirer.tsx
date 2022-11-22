import React from 'react';
import type { Position } from '@prisma/client';
import { trpc } from 'utils/trpc';
import { useRouter } from 'next/navigation';

type Props = {
  positions: Position[];
  treasury: number;
  freeNumbers: number[];
  teamName: string;
};

export function PlayerHirer({ positions, treasury, freeNumbers, teamName }: Props): React.ReactElement {
  const router = useRouter();
  const [position, setPosition] = React.useState(positions[0].name);
  const [number, setNumber] = React.useState(freeNumbers[0]);

  const handlePositionSelect = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setPosition(e.target.value);
  }, []);

  const handleNumberSelect = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = parseInt(e.target.value, 10);
    if (Number.isNaN(val)) return;
    setNumber(val);
  }, []);

  const hirePlayer = (): void => {
    void trpc.team.hirePlayer.mutate({ team: teamName, position, number })
      .then(() => {
        setNumber(freeNumbers.find(n => n !== number) ?? freeNumbers[0]);
        router.refresh();
      });
  };

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

import React from 'react';
import type { HirePlayerMutation } from './hire-player.mutation.gen';
import { HirePlayerDocument } from './hire-player.mutation.gen';
import type { TeamPageRosterPlayerFragment } from './team.query.gen';

type Props = {
  positions: TeamPageRosterPlayerFragment[];
  treasury: number;
  freeNumbers: number[];
  teamId: string;
  onHire: () => void;
};

export function PlayerHirer({ positions, treasury, freeNumbers, teamId, onHire }: Props): React.ReactElement {
  const [position, setPosition] = React.useState(positions[0].position);
  const [number, setNumber] = React.useState(freeNumbers[0]);
  const handlePositionSelect = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setPosition(e.target.value);
  }, []);
  const handleNumberSelect = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = parseInt(e.target.value, 10);
    if (Number.isNaN(val)) return;
    setNumber(val);
  }, []);
  const hirePlayer = React.useCallback(() => {
    void fetch('http://localhost:3000/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: HirePlayerDocument,
        variables: { number, position, teamId },
      }),
    })
      .then(async res => res.json() as Promise<{ data: HirePlayerMutation; errors?: unknown[] }>)
      .then(data => {
        if ((data.errors?.length ?? 0) > 0) throw new Error('Failed fetch');
        onHire();
      });
  }, [number, position, teamId, onHire]);

  return (
    <>
      <select value={position} onChange={handlePositionSelect}>
        {positions.map(p => (
          <option
            disabled={p.cost > treasury}
            key={p.position}
            value={p.position}
          >
            {p.position} - {p.cost}
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

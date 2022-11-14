'use client';
import type { ReactNode } from 'react';
import { use, useState } from 'react';
import { trpc } from 'utils/trpc';

let teamPromise = trpc.team.get.query('Team B');

export default function TeamPage(): ReactNode {
  const team = use(teamPromise);
  const [selectedPosition, setSelectedPosition] = useState(team.roster.positions[0].name);
  const [showDialog, setShowDialog] = useState(false);

  const hirePlayer = (): void => {
    void trpc.team.hirePlayer.mutate({
      team: 'Team B',
      position: selectedPosition,
    }).then(() => {
      teamPromise = trpc.team.get.query('Team B');
    });
  };

  return (
    <>
      <dialog open={showDialog}>Hello, World!</dialog>
      <table>
        <thead>
          <tr>
            <td>Name</td>
            <td>Position</td>
          </tr>
        </thead>
        <tbody>
          {team.players.map(player => <tr key={player.id}>
            <td>{player.id}</td>
            <td>{player.positionId}</td>
          </tr>)}
        </tbody>
      </table>
      {(team.state === 'Draft' || team.state === 'PostGame') && <>
        <select
          value={selectedPosition}
          onChange={(e): void => {
            setSelectedPosition(e.target.value);
          }}
        >
          {team.roster.positions.map(pos =>
            <option key={pos.name} value={pos.name}>
              {pos.name}
            </option>)}
        </select>
        <button onClick={hirePlayer}>New Player</button>
      </>}
    </>
  );
}

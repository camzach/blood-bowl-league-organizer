import React from 'react';
import type { TeamTableProps } from '../../team-table';
import { TeamTable } from '../../team-table';
import { runMutation } from '../../utils';
import type { HireJourneymanMutation } from './hire-player.mutation.gen';
import { HireJourneymanDocument } from './hire-player.mutation.gen';
import type { TeamPagePlayerFragment } from './team.query.gen';

const hiddenCols = ['#', 'Name', 'Fire'];

type Props = {
  players: TeamPagePlayerFragment[];
  baseCols: TeamTableProps<TeamPagePlayerFragment>['cols'];
  mode: 'skills' | 'hire';
  freeNumbers: number[];
  teamId: string;
  onHire: () => void;
};
export function JourneymanManager({ players, baseCols, freeNumbers, mode, teamId, onHire }: Props): React.ReactElement {
  const [numbers, setNumbers] = React.useState(Object.fromEntries(players.map((p, idx) => [p.id, freeNumbers[idx]])));
  const hireJourneyman = React.useCallback((playerId: string) => () => {
    void runMutation<HireJourneymanMutation>(HireJourneymanDocument, { number: numbers[playerId], playerId, teamId })
      .then(onHire);
  }, [numbers, onHire, teamId]);
  const handleNumberChange = React.useCallback((id: string) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    const number = parseInt(e.target.value, 10);
    if (Number.isNaN(number)) return;
    setNumbers(o => ({
      ...o,
      [id]: number,
    }));
  }, []);

  const cols = React.useMemo(() => {
    const result: TeamTableProps<TeamPagePlayerFragment>['cols'] = baseCols
      ?.filter(c => (typeof c === 'string' ? !hiddenCols.includes(c) : !hiddenCols.includes(c.name)));
    if (!result) return result;
    if (mode === 'hire') {
      result.unshift({
        name: 'Hire!',
        render: (player: TeamPagePlayerFragment) => (
          <td key="Hire!">
            <button type="button" onClick={hireJourneyman(player.id)}>Hire!</button>
          </td>
        ),
      });
      result.unshift({
        name: '#',
        render: p => (
          <td key="#">
            <select value={numbers[p.id]} onChange={handleNumberChange(p.id)}>
              {freeNumbers
                .map(n => (
                  <option key={n}>
                    {n}
                  </option>
                ))}
            </select>
          </td>
        ),
      });
    }

    return result;
  }, [baseCols, freeNumbers, handleNumberChange, hireJourneyman, mode, numbers]);

  return (
    <TeamTable
      players={players}
      cols={cols}
    />
  );
}
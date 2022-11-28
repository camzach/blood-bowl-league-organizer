import React from 'react';
import { trpc } from 'utils/trpc';
import type { FetchedTeamType } from './page';
import type { TeamTableProps } from 'components/team-table';
import { TeamTable } from 'components/team-table';

const hiddenCols = ['#', 'Name', 'Fire'];

type Props = {
  players: FetchedTeamType['journeymen'];
  baseCols: TeamTableProps<FetchedTeamType['journeymen'][number]>['cols'];
  freeNumbers: number[];
  teamName: string;
  allowHiring: boolean;
};
export function JourneymanManager({
  players,
  baseCols,
  freeNumbers,
  teamName,
  allowHiring,
}: Props): React.ReactElement {
  const [numbers, setNumbers] = React.useState(Object.fromEntries(players.map((p, idx) => [p.id, freeNumbers[idx]])));

  const hireJourneyman = (id: string) => (): void => {
    void trpc.team.hireJourneyman.mutate({ team: teamName, player: id, number: numbers[id] });
  };

  const handleNumberChange = React.useCallback((id: string) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    const number = parseInt(e.target.value, 10);
    if (Number.isNaN(number)) return;
    setNumbers(o => ({
      ...o,
      [id]: number,
    }));
  }, []);

  const cols: TeamTableProps<FetchedTeamType['journeymen'][number]>['cols'] = baseCols
    ?.filter(c => (typeof c === 'string' ? !hiddenCols.includes(c) : !hiddenCols.includes(c.name)));
  if (allowHiring) {
    cols?.unshift({
      name: 'Hire!',
      render: (player: FetchedTeamType['journeymen'][number]) => (
        <td key="Hire!">
          <button type="button" onClick={hireJourneyman(player.id)}>Hire!</button>
        </td>
      ),
    });
    cols?.unshift({
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

  return (
    <TeamTable
      players={players}
      cols={cols}
    />
  );
}

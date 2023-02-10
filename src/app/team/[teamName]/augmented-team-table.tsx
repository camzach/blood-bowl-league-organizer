'use client';
import type { PlayerType, TeamTableProps } from 'components/team-table';
import { TeamTable } from 'components/team-table';
import type { ReactElement } from 'react';
import AdvancementPicker from './advancement-picker';
import type { FetchedTeamType } from './page';
import PlayerFirer from './player-firer';
import PlayerNumberSelector from './player-number-selector';
import PlayerNameEditor from './palyer-name-editor';

const baseCols = [
  '#',
  'Name',
  'Position',
  'Skills',
  'MA',
  'ST',
  'PA',
  'AG',
  'AV',
  'NI',
  'MNG?',
  'SPP',
  'TV',
  'CTV',
] as const;

type Props<T extends PlayerType> = {
  allowHiring: boolean;
  players: FetchedTeamType['players'];
  skills: Array<{ name: string; category: string }>;
  extraCols?: TeamTableProps<T>['cols'];
};

export default function AugmentedTeamTable<T extends PlayerType>({
  players,
  allowHiring,
  skills,
}: Props<T>): ReactElement {
  const cols: NonNullable<TeamTableProps<FetchedTeamType['players'][number]>['cols']> = [...baseCols];
  if (allowHiring) {
    cols[cols.indexOf('Name')] = {
      name: 'Name',
      render: player => (
        <td key="Name">
          <PlayerNameEditor name={player.name} id={player.id} />
        </td>
      ),
    };
    cols[cols.indexOf('#')] = {
      name: '#',
      render: player => (
        <td key="#" style={{ width: '2ch' }}>
          <PlayerNumberSelector number={player.number} id={player.id} />
        </td>
      ),
    };
    cols.splice(11, 0, {
      name: 'Spend SPP',
      render: player => (
        <td key="Spend SPP">
          <AdvancementPicker player={player} rosterPlayer={player.position} skills={skills} />
        </td>
      ),
    });
    cols.splice(1, 0, {
      name: 'Fire',
      render: player => (
        <td key="Fire">
          <PlayerFirer playerId={player.id} />
        </td>
      ),
    });
  }

  return <TeamTable players={players} cols={cols} />;
}

import type React from 'react';
import { styled } from '@linaria/react';
import type { TeamTablePlayerFragment } from './team.fragment.gen';
import { Player } from './player';
import { cols } from './cols';

const Table = styled.table`
  thead {
    position: sticky;
    top: 0.25em;
    background-color: hsl(0, 0%, 60%);
  }

  tr:nth-child(2n) {
    background-color: hsl(0, 0%, 90%);
  }

  td {
    padding: 0.25em;
    text-align: center;
  }
`;

export type TeamTableProps<ExtendsPlayer extends TeamTablePlayerFragment> = {
  players: ExtendsPlayer[];
  cols?: Array<
  (typeof cols)[number] |
  { name: string; render: (player: ExtendsPlayer) => React.ReactElement }
  >;
};

export function TeamTable<T extends TeamTablePlayerFragment>({
  players,
  cols: displayCols = [...cols],
}: TeamTableProps<T>): React.ReactElement {
  return (
    <Table>
      <thead>
        <tr>
          {displayCols.map(col => {
            const colname = typeof col === 'string' ? col : col.name;
            return <th key={`th-${colname}`} col-name={col}>{colname}</th>;
          })}
        </tr>
      </thead>
      <tbody>
        {players.sort((a, b) => a.number - b.number).map(player => (
          <Player
            key={player.number}
            cols={displayCols}
            player={player}
          />
        ))}
      </tbody>
    </Table>
  );
}

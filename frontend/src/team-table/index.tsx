import type React from 'react';
import { styled } from '@linaria/react';
import type { TeamTableFragment } from './team.fragment.gen';
import { Player } from './player';
import { cols } from './cols';

const Table = styled.table`
  thead {
    background-color: hsl(0, 0%, 60%);
  }

  tr:nth-child(2n) {
    background-color: hsl(0, 0%, 90%);
  }

  td {
    padding: 0.25em;
    text-align: center;
    width: min-content;
  }

  td:nth-child(-n+4) {
    text-align: left;
  }

  td:nth-child(-n+3) {
    width: 10%;
  }

  td:nth-child(4) {
    width: 50%;
  }
`;

type Props = {
  team: TeamTableFragment;
  cols?: ReadonlyArray<(typeof cols)[number]>;
};

export function TeamTable({ team, cols: displayCols = cols }: Props): React.ReactElement {
  return (
    <Table>
      <thead>
        <tr>
          {displayCols.map(col => <th key={`th-${col}`}>{col}</th>)}
        </tr>
      </thead>
      <tbody>
        {team.players.sort((a, b) => a.number - b.number).map((player, idx) => (
          <Player
            // eslint-disable-next-line react/no-array-index-key
            key={idx}
            cols={displayCols}
            player={player}
          />
        ))}
      </tbody>
    </Table>
  );
}

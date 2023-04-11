import React from 'react';
import { Player } from './player';
import { cols } from './cols';
import styles from './styles.module.scss';

export type PlayerType = {
  id: string;
  name: string | null;
  number: number;
  MA: number;
  PA: number | null;
  AG: number;
  ST: number;
  AV: number;
  teamValue: number;
  missNextGame: boolean;
  starPlayerPoints: number;
  nigglingInjuries: number;
  skills: Array<{ name: string; rules: string; faq?: Array<{ q: string; a: string }> }>;
  position: { name: string };
};

export type TeamTableProps<T extends PlayerType> = {
  players: T[];
  cols?: Array<
  (typeof cols)[number] |
  { name: string; render: (player: T) => React.ReactElement }
  >;
};

export function TeamTable<T extends PlayerType>({
  players,
  cols: displayCols = [...cols],
}: TeamTableProps<T>): React.ReactElement {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {displayCols.map(col => {
            const colname = typeof col === 'string' ? col : col.name;
            return <th key={`th-${colname}`} col-name={colname}>{colname}</th>;
          })}
        </tr>
      </thead>
      <tbody>
        {players
          .sort((a, b) => a.number - b.number)
          .map(player => (
            <Player
              key={player.id}
              cols={displayCols}
              player={player}
            />
          ))}
      </tbody>
    </table>
  );
}

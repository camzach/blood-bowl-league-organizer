import type { ReactElement } from 'react';
import React from 'react';
import { styled } from '@linaria/react';
import type { cols } from './cols';
import type { TeamQuery } from '../team-page/content/team.query.gen';

const Skill = styled.span`
  &:nth-child(2n) {
    color: #9e0000;
  }

  white-space: nowrap;
`;

type Props = {
  player: NonNullable<TeamQuery['team']>['players'][number];
  cols: ReadonlyArray<(typeof cols)[number]>;
};

export function Player({ player, cols }: Props): React.ReactElement {
  const renderCols: Record<Props['cols'][number], React.ReactElement> = React.useMemo(() => {
    const {
      MVPs,
      casualties,
      completions,
      deflections,
      interceptions,
      touchdowns,
      prayersToNuffle,
    } = player.starPlayerPoints;
    const calculatedSPP =
      (MVPs * 4) +
      (casualties * 2) +
      (completions) +
      (deflections) +
      (interceptions * 2) +
      (touchdowns * 3) +
      (prayersToNuffle);
    const statCols = Object.fromEntries((['MA', 'ST', 'PA', 'AG', 'AV'] as const).map(stat => [
      stat,
      <td key={stat}>
        {player.stats[stat] ?? '-'}{player.stats[stat] !== null && ['PA', 'AG', 'AV'].includes(stat) && '+'}
      </td>,
    ])) as Record<'AG' | 'AV' | 'MA' | 'PA' | 'ST', ReactElement>;

    return {
      '#': <td key="#">{player.number}</td>,
      'CTV': <td key="CTV">{`${player.teamValue.current / 1000}k`}</td>,
      'MNG?': <td key="mng">{player.casualties.missNextGame && '🤕'}</td>,
      'NI': <td key="NI">{player.casualties.niggles}</td>,
      'Name': <td key="Name">{player.name}</td>,
      'Position': <td key="Position">{player.position}</td>,
      'SPP': <td key="SPP">{calculatedSPP}</td>,
      'Skills': (
        <td key="Skills">
          {player.skills.map((skill, idx) => (
            <React.Fragment key={skill}>
              <Skill>{skill}</Skill>
              {idx < player.skills.length - 1 ? ', ' : ''}
            </React.Fragment>
          ))}
        </td>
      ),
      'TV': <td key="TV">{`${player.teamValue.base / 1000}k`}</td>,
      ...statCols,
    };
  }, [player]);

  return (
    <tr>
      {cols.map(col => renderCols[col])}
    </tr>
  );
}

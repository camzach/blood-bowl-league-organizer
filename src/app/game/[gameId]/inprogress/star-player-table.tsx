'use client';
import type { Skill, StarPlayer } from '@prisma/client';
import { TeamTable } from 'components/team-table';
import type { ReactElement } from 'react';

type Props = {
  stars: Array<StarPlayer & { skills: Skill[] }>;
};

export default function StarPlayerTable({ stars }: Props): ReactElement {
  return <TeamTable
    players={stars.map((p, i) => ({
      ...p,
      id: p.name,
      number: i,
      teamValue: p.hiringFee,
      missNextGame: false,
      nigglingInjuries: 0,
      starPlayerPoints: 0,
      position: { name: 'STAR' },
    }))}
    cols={[
      'Name',
      'Skills',
      'MA',
      'ST',
      'AV',
      'AG',
      'PA',
      {
        name: 'Special Rule',
        render(player): ReactElement {
          const [ruleName, ruleText] = player.specialRule.split(': ');
          return <td key="specialRule"><dfn title={ruleText}>{ruleName}</dfn></td>;
        },
      },
    ]}
  />;
}

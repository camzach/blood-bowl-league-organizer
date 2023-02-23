import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';
import { prisma } from 'utils/prisma';
import React from 'react';
import { JourneymanManager } from './journeyman-manager';
import { RedraftManager } from './redraft-manager';
import { PlayerHirer } from './player-hirer';
import StaffHirer from './staff-hirer';
import calculateTV from 'utils/calculate-tv';
import { getServerSession } from 'next-auth';
import { authOptions } from 'pages/api/auth/[...nextauth]';
import AugmentedTeamTable from './augmented-team-table';
import ReadyTeam from './ready-team';
import { TeamState } from '@prisma/client';

type Props = { params: { teamName: string } };

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function fetchTeam(teamName: string) {
  return prisma.team.findUnique({
    where: { name: teamName },
    include: {
      roster: { include: { positions: true } },
      players: { include: { skills: true, position: true } },
      journeymen: { include: { skills: true, position: true } },
      redrafts: { include: { skills: true, position: true } },
    },
  });
}
export type FetchedTeamType = NonNullable<Awaited<ReturnType<typeof fetchTeam>>>;

export default async function TeamPage({ params: { teamName } }: Props): Promise<ReactElement> {
  const team = await fetchTeam(decodeURIComponent(teamName));
  const skills = await prisma.skill.findMany({});
  const session = await getServerSession(authOptions);

  if (!team)
    return notFound();

  const allowHiring = (team.state === TeamState.Draft || team.state === TeamState.PostGame) &&
                     // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                     (session?.user.teams?.includes(team.name) ?? false);

  const freeNumbers = Array.from(new Array(16), (_, idx) => idx + 1)
    .filter(n => !team.players.some(p => p.number === n));

  return (
    <section>
      <h1>{team.name}</h1>
      <h2>TV - {calculateTV(team)}</h2>
      Treasury -- {team.treasury}
      <br />
      Dedicated Fans -- {team.state === TeamState.Draft && allowHiring
        ? <StaffHirer
          title={'Dedicated Fans'}
          type={'dedicatedFans'}
          current={team.dedicatedFans}
          cost={10_000}
          teamName={team.name}
          treasury={team.treasury}
          max={7}
        />
        : team.dedicatedFans}
      <AugmentedTeamTable players={team.players} skills={skills} allowHiring={allowHiring} />
      {allowHiring && <PlayerHirer
        positions={team.roster.positions.filter(pos =>
          team.players.filter(p => p.position.name === pos.name).length < pos.max)}
        treasury={team.treasury}
        freeNumbers={freeNumbers}
        teamName={team.name}
      />}
      {team.journeymen.length > 0 &&
        <JourneymanManager
          players={team.journeymen}
          freeNumbers={freeNumbers}
          teamName={team.name}
          allowHiring={allowHiring}
          skills={skills}
        />}
      {team.state === TeamState.Draft && team.redrafts.length > 0 &&
        <RedraftManager
          players={team.redrafts}
          freeNumbers={freeNumbers}
          teamName={team.name}
          allowHiring={allowHiring}
          skills={skills}
        />}
      <table>
        <thead>
          <tr>
            <th />
            <th>Cost</th>
            <th>Count</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Rerolls</td>
            <td>{team.roster.rerollCost.toLocaleString()} / {(team.roster.rerollCost * 2).toLocaleString()}</td>
            <td>
              {allowHiring
                ? <StaffHirer
                  teamName={team.name}
                  type={'rerolls'}
                  title={'Rerolls'}
                  treasury={team.treasury}
                  current={team.rerolls}
                  cost={team.state === TeamState.Draft ? team.roster.rerollCost : team.roster.rerollCost * 2}
                  max={6}
                />
                : team.rerolls}
            </td>
            <td>{(team.rerolls * team.roster.rerollCost).toLocaleString()}</td>
          </tr>
          <tr>
            <td>Assistant Coaches</td>
            <td>10,000</td>
            <td>
              {allowHiring
                ? <StaffHirer
                  teamName={team.name}
                  type={'assistantCoaches'}
                  title={'Assistant Coaches'}
                  treasury={team.treasury}
                  current={team.assistantCoaches}
                  cost={10_000}
                  max={10}
                />
                : team.assistantCoaches}
            </td>
            <td>{(team.assistantCoaches * 10000).toLocaleString()}</td>
          </tr>
          <tr>
            <td>Cheerleaders</td>
            <td>10,000</td>
            <td>
              {allowHiring
                ? <StaffHirer
                  teamName={team.name}
                  type={'cheerleaders'}
                  title={'Cheerleaders'}
                  treasury={team.treasury}
                  current={team.cheerleaders}
                  cost={10_000}
                  max={10}
                />
                : team.cheerleaders}
            </td>
            <td>{team.cheerleaders * 10000}</td>
          </tr>
          <tr>
            <td>Apothecary</td>
            <td>50,000</td>
            <td>
              {allowHiring
                ? <StaffHirer
                  teamName={team.name}
                  type={'apothecary'}
                  title={'Apothecary'}
                  current={Number(team.apothecary)}
                  cost={50_000}
                  treasury={team.treasury}
                  max={1}
                />
                : <input type="checkbox" checked={team.apothecary} disabled></input>}
            </td>
            <td>{(team.apothecary ? 50_000 : 0).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
      {allowHiring &&
        <ReadyTeam team={team.name} />
      }
    </section>
  );
}

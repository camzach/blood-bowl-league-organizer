'use client';
import React from 'react';
import type { TeamTableProps } from 'components/team-table';
import { TeamTable } from 'components/team-table';
import AdvancementPicker from './advancement-picker';
import { JourneymanManager } from './journeyman-table';
import { PlayerHirer } from './player-hirer';
import type { FetchedTeamType } from './page';
import { useRouter } from 'next/navigation';
import { trpc } from 'utils/trpc';
import StaffHirer from './staff-hirer';
import calculateTV from 'utils/calculate-tv';

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

type Props = {
  team: FetchedTeamType;
};

export default function TeamPage({ team }: Props): React.ReactElement {
  const router = useRouter();

  const handleFire = (id: string) => () => {
    void trpc.player.fire.mutate(id)
      .then(() => {
        router.refresh();
      });
  };
  const readyTeam = (): void => {
    void trpc.team.ready.mutate(team.name)
      .then(() => {
        router.refresh();
      });
  };

  const allowHiring = team.state === 'Draft' || team.state === 'PostGame';

  const cols: NonNullable<TeamTableProps<Props['team']['players'][number]>['cols']> = [...baseCols];
  if (allowHiring) {
    cols.splice(11, 0, {
      name: 'Spend SPP',
      render: player => (
        <td key="Spend SPP">
          <AdvancementPicker player={player} rosterPlayer={player.position} />
        </td>
      ),
    });
    cols.splice(1, 0, {
      name: 'Fire',
      render: player => (
        <td key="Fire">
          <button type="button" onClick={handleFire(player.id)}>Fire!</button>
        </td>
      ),
    });
  }

  const freeNumbers = Array.from(new Array(16), (_, idx) => idx + 1)
    .filter(n => !team.players.some(p => p.number === n));

  return (
    <section>
      <h1>{team.name}</h1>
      <h2>TV - {calculateTV(team)}</h2>
      Treasury -- {team.treasury}
      <br />
      Dedicated Fans -- {team.state === 'Draft'
        ? <StaffHirer
          title={'Dedicated Fans'}
          type={'dedicatedFans'}
          current={team.dedicatedFans}
          cost={10_000}
          teamName={team.name}
          max={7}
        />
        : team.dedicatedFans}
      <TeamTable players={team.players} cols={cols} />
      {team.journeymen.length > 0 &&
        <JourneymanManager
          players={team.journeymen}
          baseCols={cols}
          freeNumbers={freeNumbers}
          teamName={team.name}
          allowHiring={allowHiring}
        />}
      {allowHiring && <PlayerHirer
        positions={team.roster.positions.filter(pos =>
          team.players.filter(p => p.position.name === pos.name).length < pos.max)}
        treasury={team.treasury}
        freeNumbers={freeNumbers}
        teamName={team.name}
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
                  max={8}
                  current={team.rerolls}
                  cost={team.state === 'Draft' ? team.roster.rerollCost : team.roster.rerollCost * 2}
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
                  max={10}
                  current={team.assistantCoaches}
                  cost={10000}
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
                  max={10}
                  current={team.cheerleaders}
                  cost={10000}
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
                  max={1}
                  current={Number(team.apothecary)}
                  cost={10000}
                />
                : <input type="checkbox" checked disabled></input>}
            </td>
            <td>{(team.apothecary ? 50000 : 0).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
      {allowHiring &&
        <button onClick={readyTeam}>Ready for next game</button>
      }
    </section>
  );
}

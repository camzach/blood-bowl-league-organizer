'use client';
import React from 'react';
import type { TeamTableProps } from './team-table';
import { TeamTable } from './team-table';
import { AdvancementPicker, advancementCosts } from './advancement-picker';
import { JourneymanManager } from './journeyman-table';
import { PlayerHirer } from './player-hirer';
import type { FetchedTeamType } from './page';
import { useRouter } from 'next/navigation';
import { trpc } from 'utils/trpc';

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

  const [popup, setPopup] = React.useState('');
  const popupRef: React.RefObject<HTMLDialogElement> = React.useRef<HTMLDialogElement>(null);
  const showPopup = React.useCallback((id: string) => () => {
    setPopup(id);
    popupRef.current?.showModal();
  }, []);
  const hidePopup = React.useCallback(() => {
    setPopup('');
    popupRef.current?.close();
  }, []);

  const handleFire = (id: string) => () => {
    void trpc.player.fire.mutate(id)
      .then(() => {
        router.refresh();
      });
  };

  const renderPopup = (): React.ReactElement | null => {
    // TODO: journeymen?
    const searchSpace = [...team.players];
    const thisPlayer = searchSpace.find(p => p.id === popup);
    const rosterPlayer = team.roster.positions.find(p => p.id === thisPlayer?.positionId);
    if (!thisPlayer || !rosterPlayer) return null;
    return (
      <AdvancementPicker
        player={thisPlayer}
        rosterPlayer={rosterPlayer}
        onHide={hidePopup}
      />
    );
  };

  const cols: NonNullable<TeamTableProps<Props['team']['players'][number]>['cols']> = [...baseCols];
  cols.splice(11, 0, {
    name: 'Spend SPP',
    render: player => (
      <td key="Spend SPP">
        {Object.values(advancementCosts).some(costs =>
          costs[player.totalImprovements] <= player.starPlayerPoints) &&
            <button type="button" onClick={showPopup(player.id)}>Spend SPP</button>}
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

  const freeNumbers = Array.from(new Array(16), (_, idx) => idx + 1)
    .filter(n => !team.players.some(p => p.number === n));

  return (
    <section>
      <dialog ref={popupRef}>{renderPopup()}</dialog>
      <h1>{team.name}</h1>
      <TeamTable players={team.players} cols={cols} />
      {team.journeymen.length > 0 &&
        <JourneymanManager
          players={team.journeymen}
          baseCols={cols}
          freeNumbers={freeNumbers}
          teamName={team.name}
        />}
      <PlayerHirer
        positions={team.roster.positions.filter(pos =>
          team.players.filter(p => p.position.name === pos.name).length < pos.max)}
        treasury={team.treasury}
        freeNumbers={freeNumbers}
        teamName={team.name}
      />
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
            <td>{team.roster.rerollCost}</td>
            <td>{team.rerolls}</td>
            <td>{team.rerolls * team.roster.rerollCost}</td>
          </tr>
          <tr>
            <td>Assistant Coaches</td>
            <td>10,000</td>
            <td>{team.assistantCoaches}</td>
            <td>{team.assistantCoaches * 10000}</td>
          </tr>
          <tr>
            <td>Cheerleaders</td>
            <td>10,000</td>
            <td>{team.cheerleaders}</td>
            <td>{team.cheerleaders * 10000}</td>
          </tr>
          <tr>
            <td>Apothecary</td>
            <td>50,000</td>
            <td>{team.apothecary ? 1 : 0}</td>
            <td>{team.apothecary ? 50000 : 0}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

import React from 'react';
import { useParams } from 'react-router-dom';
import type { TeamTableProps } from '../../team-table';
import { TeamTable } from '../../team-table';
import { AdvancementPicker, advancementCosts } from './advancement-picker';
import type { TeamPagePlayerFragment } from './team.query.gen';
import { useTeamQuery } from './team.query.gen';

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

export function Content(): React.ReactElement {
  const { team: teamParam } = useParams();
  const { isLoading, isError, data } = useTeamQuery({ id: teamParam ?? '' });
  const [mode, setMode] = React.useState<'view' | 'skills' | 'hire'>('skills');

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
  const cols = React.useMemo(() => {
    const result: NonNullable<TeamTableProps<TeamPagePlayerFragment>['cols']> = [...baseCols];
    if (mode === 'skills') {
      result.splice(11, 0, {
        name: 'Spend SPP',
        render: (player: TeamPagePlayerFragment) => (
          <td key="Spend SPP">
            {Object.values(advancementCosts).some(costs =>
              costs[player.progression.length] <= player.starPlayerPoints.current) &&
                <button type="button" onClick={showPopup(player.id)}>Spend SPP</button>}
          </td>
        ),
      });
    }

    return result;
  }, [mode, showPopup]);

  const handlePlayerImprovement = React.useCallback((player: TeamPagePlayerFragment) => {
    if (!data?.team) return;
    const updateIndex = data.team.players.findIndex(p => p.id === player.id);
    if (updateIndex === -1) return;
    data.team.players[updateIndex] = player;
    hidePopup();
  }, [data?.team, hidePopup]);

  const renderPopup = React.useCallback((): React.ReactElement | null => {
    const thisPlayer = data?.team?.players.find(p => p.id === popup);
    const rosterPlayer = data?.team?.race.players.find(p => p.position === thisPlayer?.position);
    if (!thisPlayer || !rosterPlayer) return null;
    return (
      <AdvancementPicker
        player={thisPlayer}
        rosterPlayer={rosterPlayer}
        onAdvancementChosen={handlePlayerImprovement}
      />
    );
  }, [data?.team?.players, data?.team?.race.players, handlePlayerImprovement, popup]);

  if (isLoading) return <>Loading...</>;
  if (isError || !data?.team) return <>Failed to load team info</>;
  const { team } = data;
  return (
    <section>
      <dialog ref={popupRef}>{renderPopup()}</dialog>
      <h1>{team.name}</h1>
      <TeamTable players={team.players} cols={cols} />
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
            <td>{team.race.rerollCost}</td>
            <td>{team.rerolls}</td>
            <td>{team.rerolls * team.race.rerollCost}</td>
          </tr>
          <tr>
            <td>Assistant Coaches</td>
            <td>10,000</td>
            <td>{team.coaches}</td>
            <td>{team.coaches * 10000}</td>
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

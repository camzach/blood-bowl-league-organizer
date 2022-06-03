import React from 'react';
import { useParams } from 'react-router-dom';
import type { TeamTableProps } from '../../team-table';
import { TeamTable } from '../../team-table';
import { AdvancementPicker, advancementCosts } from './advancement-picker';
import { useTeamQuery } from './team.query.gen';
import type { TeamQuery } from './team.query.gen';

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
  const [updates, setUpdates] = React.useState({ advancements: {}, hires: {}, fires: {} });

  const [popup, setPopup] = React.useState('');
  const popupRef: React.MutableRefObject<HTMLDialogElement | null> = React.useRef(null);
  const setPopupRef = React.useCallback((ref: HTMLDialogElement | null) => {
    popupRef.current = ref;
    ref?.addEventListener('cancel', e => {
      e.preventDefault();
    });
    ref?.addEventListener('close', () => {
      setPopup('');
    });
  }, []);
  const showPopup = React.useCallback((id: string) => () => {
    setPopup(id);
    popupRef.current?.showModal();
  }, []);
  const hidePopup = React.useCallback(() => {
    popupRef.current?.close();
  }, []);
  const cols = React.useMemo(() => {
      type PlayerType = NonNullable<TeamQuery['team']>['players'][number];
      const result: NonNullable<TeamTableProps<PlayerType>['cols']> = [...baseCols];
      if (mode === 'skills') {
        result.splice(11, 0, {
          name: 'Spend SPP',
          render: (player: PlayerType) => (
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

  const handlePlayerImprovement = React.useCallback((id: string, improvement: string) => {
    console.log(id, improvement);
    popupRef.current?.close();
  }, []);

  const renderPopup = React.useCallback((): React.ReactElement | null => {
    const thisPlayer = data?.team?.players.find(p => p.id === popup);
    const rosterPlayer = data?.team?.race.players.find(p => p.position === thisPlayer?.position);
    if (!thisPlayer || !rosterPlayer) return null;
    return (
      <AdvancementPicker
        player={thisPlayer}
        rosterPlayer={rosterPlayer}
        onAdvancementChosen={handlePlayerImprovement}
        onCancel={hidePopup}
      />
    );
  }, [data?.team?.players, data?.team?.race.players, handlePlayerImprovement, hidePopup, popup]);

  if (isLoading) return <>Loading...</>;
  if (isError || !data?.team) return <>Failed to load team info</>;
  const { team } = data;
  return (
    <section>
      <dialog ref={setPopupRef}>{renderPopup()}</dialog>
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

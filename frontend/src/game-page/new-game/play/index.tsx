import { styled } from '@linaria/react';
import React from 'react';
import { gameContext, injuryOptions, sppOptions } from '../game-context';
import { TeamTable } from '../../../team-table';
import { combinePlayers } from './utils';
import { NumberInput } from '../../../number-input';

const Container = styled.div`
  display: flex;
  justify-content: space-evenly;
`;
const TableContainer = styled.div`
  flex-basis: 40%;
  max-height: 75vh;
  overflow: scroll;
`;
const ControlWrapper = styled.div`
  display: flex;
  justify-content: space-between;
`;
const Popup = styled.dialog`
`;

type PickerProps = {
  opts: string[];
  onSelect: (option: string) => void;
};
function Picker({ opts, onSelect }: PickerProps): React.ReactElement {
  const [opt, setOpt] = React.useState(opts[0]);
  const handleChange = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setOpt(e.target.value);
  }, []);
  const handleSubmit = React.useCallback(() => {
    onSelect(opt);
  }, [onSelect, opt]);
  return (
    <>
      <select onChange={handleChange}>
        {opts.map(i =>
          (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
      </select>
      <button type="button" onClick={handleSubmit}>Add</button>
    </>
  );
}

export function Play(): React.ReactElement {
  const { gameInfo, dispatch } = React.useContext(gameContext);
  const [results, setResults] = React.useState<(typeof gameInfo)['results']>({
    touchdowns: { home: 0, away: 0 },
    casualties: { home: 0, away: 0 },
    playerUpdates: {},
  });

  const popupRef = React.useRef<HTMLDialogElement>(null);
  const [popup, setPopup] = React.useState<['spp' | 'cas', string] | null>(null);
  const showPopup = React.useCallback((val: 'spp' | 'cas', id: string) => () => {
    if (popupRef.current) popupRef.current.showModal();
    setPopup([val, id]);
  }, []);
  const hidePopup = React.useCallback(() => {
    popupRef.current?.close();
  }, []);

  const teamCols = React.useMemo<React.ComponentProps<typeof TeamTable>['cols']>(() => [
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
    {
      name: 'Actions',
      render: ({ id }): React.ReactElement => (
        <td key="Actions">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <button type="button" onClick={showPopup('spp', id)}>
              {`SPP (${results.playerUpdates[id]?.spp.length ?? 0})`}
            </button>
            <button type="button" onClick={showPopup('cas', id)}>
              {`Casualty${(results.playerUpdates[id]?.cas
                .some(upd => injuryOptions.includes(upd)) ?? false)
                ? '(🤕)'
                : ''}
              `}
            </button>
          </div>
        </td>),
    },
  ], [results.playerUpdates, showPopup]);

  const updateResults = React.useCallback((type: 'touchdowns' | 'casualties', team: 'home' | 'away') =>
    (val: number) => {
      if (Number.isNaN(val)) return;
      setResults(old => ({
        ...old,
        [type]: {
          ...old[type],
          [team]: val,
        },
      }));
    }, []);

  const updatePlayer = React.useCallback((type: 'spp' | 'cas', playerId: string) => (result: string) => {
    setResults(old => ({
      ...old,
      playerUpdates: {
        ...old.playerUpdates,
        [playerId]: {
          ...old.playerUpdates[playerId] ?? { cas: [], spp: [] },
          [type]: [...old.playerUpdates[playerId]?.[type] ?? [], result],
        },
      },
    }));
  }, []);

  const [homePlayers, awayPlayers] = React.useMemo(() => {
    const home = combinePlayers(gameInfo.home.players);
    // .filter(p => !(results.playerUpdates[p.id]?.some(update => injuryOptions.includes(update)) ?? false));
    const away = combinePlayers(gameInfo.away.players);
    // .filter(p => !(results.playerUpdates[p.id]?.some(update => injuryOptions.includes(update)) ?? false));
    return [home, away];
  }, [gameInfo.away.players, gameInfo.home.players]);

  const renderPopup = React.useCallback(() => (
    <Popup ref={popupRef}>
      <React.Fragment key={popup?.[0] ?? ''}>
        {((): React.ReactElement => {
          if (!popup) return <>Something went wrong</>;
          const [whichPopup, playerId] = popup;
          switch (whichPopup) {
            case 'spp':
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  {results.playerUpdates[playerId]?.spp.map(upd => (
                    <React.Fragment key={upd}>
                      <p>{upd}</p>
                      <button type="button">Remove</button>
                    </React.Fragment>
                  ))}
                  <Picker opts={sppOptions} onSelect={updatePlayer('spp', playerId)} />
                </div>
              );
            case 'cas':
              return <Picker opts={injuryOptions} onSelect={updatePlayer('cas', playerId)} />;
            default: return null as never;
          }
        })()}
      </React.Fragment>
      <button type="reset" onClick={hidePopup}>Done</button>
    </Popup>
  ), [popup, hidePopup, results.playerUpdates, updatePlayer]);

  return (
    <Container>
      {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
      {renderPopup()}
      <TableContainer>
        <TeamTable players={homePlayers} cols={teamCols} />
      </TableContainer>
      <div>
        <ControlWrapper>
          <NumberInput
            min={0}
            value={results.touchdowns.home}
            onChange={updateResults('touchdowns', 'home')}
            label="Home Touchdowns"
          />
          Touchdowns
          <NumberInput
            min={0}
            value={results.touchdowns.away}
            label="Away Touchdowns"
            onChange={updateResults('touchdowns', 'away')}
          />
        </ControlWrapper>
        <ControlWrapper>
          <NumberInput
            min={0}
            value={results.casualties.home}
            label="Home Casualties"
            onChange={updateResults('casualties', 'home')}
          />
          Casualties
          <NumberInput
            min={0}
            value={results.casualties.away}
            label="Away Casualties"
            onChange={updateResults('casualties', 'away')}
          />
        </ControlWrapper>
      </div>
      <TableContainer>
        <TeamTable players={awayPlayers} cols={teamCols} />
      </TableContainer>
    </Container>
  );
}

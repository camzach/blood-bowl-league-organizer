import React from 'react';
import { NumberInput } from '../../../number-input';
import { gameContext } from '../game-context';
import type { RosterPlayersFragment } from '../queries/roster.query.gen';
import { useRostersQuery } from '../queries/roster.query.gen';

type SelectorProps = {
  linemen: RosterPlayersFragment['players'];
  count: number;
  selections: RosterPlayersFragment['players'];
  setSelections: (selections: RosterPlayersFragment['players']) => void;
};
function JourneymanSelector({ linemen, count, selections, setSelections }: SelectorProps): React.ReactElement {
  const selectionHandler = React.useCallback((pos: string) => (val: number) => {
    const newLinemen = selections.filter(p => p.position !== pos);
    const player = linemen.find(p => p.position === pos);
    if (!player || Number.isNaN(val)) return;
    newLinemen.push(...Array.from(new Array(val), () => ({ ...player })));
    if (newLinemen.length > count) return;
    setSelections(newLinemen);
  }, [linemen, selections, count, setSelections]);

  return (
    <>
      {linemen.map(lm => (
        <NumberInput
          key={lm.position}
          value={selections.filter(p => p.position === lm.position).length}
          min={0}
          max={count}
          label={lm.position}
          showLabel
          onChange={selectionHandler(lm.position)}
        />
      ))}
    </>
  );
}

export function Journeymen(): React.ReactElement {
  const { gameInfo, dispatch } = React.useContext(gameContext);
  const { home, away } = gameInfo;
  const { isLoading, isError, data } = useRostersQuery({ home: home.race, away: away.race });
  const [selections, setSelections] = React.useState<Record<'away' | 'home', RosterPlayersFragment['players']>>({
    home: [],
    away: [],
  });

  const extractedData = React.useMemo(() => {
    if (!data?.away || !data.home) return null;
    return {
      linemenAway: data.away.players.filter(p => p.max >= 12).map(p => ({
        ...p,
        skills: [...p.skills, { name: 'Loner (4+)', rules: '' }],
      })),
      linemenHome: data.home.players.filter(p => p.max >= 12).map(p => ({
        ...p,
        skills: [...p.skills, { name: 'Loner (4+)', rules: '' }],
      })),
      jmAway: Math.max(0, 11 - away.players.roster.length),
      jmHome: Math.max(0, 11 - home.players.roster.length),
    };
  }, [
    data?.away,
    data?.home,
    home.players.roster.length,
    away.players.roster.length,
  ]);

  React.useEffect(() => {
    if (!extractedData) return;
    const { linemenHome, linemenAway, jmHome, jmAway } = extractedData;
    setSelections({
      home: Array.from(new Array(jmHome), () => linemenHome[0]),
      away: Array.from(new Array(jmAway), () => linemenAway[0]),
    });
  }, [extractedData]);

  const handleResult = React.useCallback(() => {
    dispatch({ type: 'journeymen', ...selections });
  }, [dispatch, selections]);

  const handleSelection = React.useCallback((team: 'away' | 'home') =>
    (selection: RosterPlayersFragment['players']) => {
      setSelections(old => ({ ...old, [team]: selection }));
    }, []);

  if (isLoading) return <>Loading...</>;
  if (isError || !extractedData) return <>Error</>;

  const { jmHome, jmAway, linemenHome, linemenAway } = extractedData;
  return (
    <>
      <h1>Take on Journeymen</h1>
      <div style={{ display: 'flex', justifyContent: 'space-evenly' }}>
        {jmHome > 0 &&
          <section>
            <h2>{home.name}</h2>
            <JourneymanSelector
              count={jmHome}
              linemen={linemenHome}
              selections={selections.home}
              setSelections={handleSelection('home')}
            />
          </section>}
        {jmAway > 0 &&
          <section>
            <h2>{away.name}</h2>
            <JourneymanSelector
              count={jmAway}
              linemen={linemenAway}
              selections={selections.away}
              setSelections={handleSelection('away')}
            />
          </section>}
      </div>
      <button
        disabled={selections.away.length !== jmAway || selections.home.length !== jmHome}
        type="button"
        onClick={handleResult}
      >
        Done with Journeymen
      </button>
    </>
  );
}

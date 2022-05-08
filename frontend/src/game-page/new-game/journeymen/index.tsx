import React from 'react';
import type { RosterPlayersFragment } from '../queries/roster.query.gen';
import { useRostersQuery } from '../queries/roster.query.gen';
import type { PregameFragment } from '../queries/team-values.query.gen';

type SelectorProps = {
  linemen: RosterPlayersFragment['players'];
  count: number;
  selections: RosterPlayersFragment['players'];
  setSelections: (selections: RosterPlayersFragment['players']) => void;
};
function JourneymanSelector({ linemen, count, selections, setSelections }: SelectorProps): React.ReactElement {
  const baseId = React.useId();

  const selectionHandler = React.useCallback((pos: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLinemen = selections.filter(p => p.position !== pos);
    const player = linemen.find(p => p.position === pos);
    if (!player) return;
    newLinemen.push(...Array.from(new Array(e.target.valueAsNumber), () => ({ ...player })));
    if (newLinemen.length > count) return;
    setSelections(newLinemen);
  }, [linemen, selections, count, setSelections]);

  return (
    <section>
      <h2>Team Name?</h2>
      {linemen.map(lm => (
        <label key={lm.position} htmlFor={`${baseId}-${lm.position}`}>
          {lm.position}
          <input
            id={`${baseId}-${lm.position}`}
            type="number"
            value={selections.filter(p => p.position === lm.position).length}
            onChange={selectionHandler(lm.position)}
          />
        </label>
      ))}
    </section>
  );
}

type Props = {
  home: PregameFragment;
  away: PregameFragment;
  onResult: (result: Record<'away' | 'home', RosterPlayersFragment['players']>) => void;
};
export function Journeymen({ home, away, onResult }: Props): React.ReactElement {
  const { isLoading, isError, data } = useRostersQuery({ home: home.race, away: away.race });
  const [selections, setSelections] = React.useState<Record<'away' | 'home', RosterPlayersFragment['players']>>({
    home: [],
    away: [],
  });

  const extractedData = React.useMemo(() => {
    if (!data?.away || !data.home) return null;
    return {
      linemenAway: data.away.players.filter(p => p.max >= 12).map(p => ({ ...p, skills: [...p.skills, 'Loner (4+)'] })),
      linemenHome: data.home.players.filter(p => p.max >= 12).map(p => ({ ...p, skills: [...p.skills, 'Loner (4+)'] })),
      jmAway: Math.max(0, 11 - away.players.length),
      jmHome: Math.max(0, 11 - home.players.length),
    };
  }, [
    data?.away,
    data?.home,
    home.players.length,
    away.players.length,
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
    onResult(selections);
  }, [onResult, selections]);

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
          <JourneymanSelector
            count={jmHome}
            linemen={linemenHome}
            selections={selections.home}
            setSelections={handleSelection('home')}
          />}
        {jmAway > 0 &&
          <JourneymanSelector
            count={jmAway}
            linemen={linemenAway}
            selections={selections.away}
            setSelections={handleSelection('home')}
          />}
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

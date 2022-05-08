import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Inducements } from './inducements';
import { Fans } from './fans';
import { usePregameInfoQuery } from './queries/team-values.query.gen';
import { Weather } from './weather';
import type { InducementFragment } from './queries/inducements.query.gen';
import { Journeymen } from './journeymen';
import type { RosterPlayersFragment } from './queries/roster.query.gen';

export type SelectedInducementsType =
  Record<keyof Omit<InducementFragment, 'basic'>, string[]>
  & { basic: Partial<Record<string, number>>; totalCost: number };

type GameInfo = {
  fans?: { home: number; away: number };
  weather?: string;
  journeymen?: { home: RosterPlayersFragment['players']; away: RosterPlayersFragment['players'] };
  inducements?: { home: SelectedInducementsType; away: SelectedInducementsType };
};

export function NewGame(): React.ReactElement {
  const [searchParams] = useSearchParams();
  const home = searchParams.get('home') ?? '';
  const away = searchParams.get('away') ?? '';

  const { isLoading, isError, data } = usePregameInfoQuery({ home, away });

  const [gameInfo, setGameInfo] = React.useState<GameInfo>({});

  const resultHandler = React.useCallback(
    (key: keyof GameInfo) => (result: GameInfo[typeof key]) => {
      setGameInfo(o => ({ ...o, [key]: result }));
    }
    , []
  );

  if (!home || !away) {
    return (
      <>
        <p>Home and Away teams not specified.</p>
        <p>Please return to the schedule page and select the game to be played.</p>
      </>
    );
  }

  if (isLoading) return <>Loading...</>;
  if (isError ||
    !data ||
    !data.home ||
    !data.away
  ) return <>Error</>;

  if (gameInfo.fans === undefined) {
    return (
      <Fans
        away={data.away}
        home={data.home}
        onResult={resultHandler('fans')}
      />
    );
  }

  if (gameInfo.weather === undefined) return <Weather onResult={resultHandler('weather')} />;

  if (gameInfo.journeymen === undefined) {
    return (
      <Journeymen
        away={data.away}
        home={data.home}
        onResult={resultHandler('journeymen')}
      />
    );
  }

  if (!gameInfo.inducements) {
    return (
      <Inducements
        away={data.away}
        home={data.home}
        onResult={resultHandler('inducements')}
      />
    );
  }

  return (
    <pre>{JSON.stringify(gameInfo, null, 4)}</pre>
  );
}

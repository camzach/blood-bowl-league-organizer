import React from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PregameInfoQuery } from './queries/team-values.query.gen';
import type { GameInfo } from './game-context';
import { emptyGame, gameContext, reducer } from './game-context';
import { usePregameInfoQuery } from './queries/team-values.query.gen';
import { Inducements } from './inducements';
import { Fans } from './fans';
import { Weather } from './weather';
import { Journeymen } from './journeymen';
import { PrayersToNuffle } from './prayers-to-nuffle';
import { Play } from './play';
import { Submit } from './submit';

export function NewGame(): React.ReactElement {
  const [searchParams] = useSearchParams();
  const home = searchParams.get('home') ?? '';
  const away = searchParams.get('away') ?? '';

  const { isLoading, isError, data } = usePregameInfoQuery({ home, away });

  const [gameInfo, dispatch] = React.useReducer(reducer, emptyGame);
  const contextValue = React.useMemo(() => ({ gameInfo, dispatch }), [gameInfo, dispatch]);

  React.useEffect(() => {
    if (!data) return;
    if (!data.home || !data.away) return;
    if (!Object.is(gameInfo, emptyGame)) return;
    const teamToContextTeam = (team: NonNullable<PregameInfoQuery['home' | 'away']>): GameInfo['home' | 'away'] => ({
      name: team.name,
      race: team.race.name,
      fans: team.fans,
      fanFactor: 0,
      treasury: team.treasury,
      inducements: { basic: [], wizards: [], starPlayers: [] },
      currentTeamValue: team.teamValue.current,
      players: { roster: team.players, starPlayers: [], journeymen: [] },
      specialRules: team.race.specialRules,
    });
    dispatch({
      type: 'initialize',
      home: teamToContextTeam(data.home),
      away: teamToContextTeam(data.away),
    });
  }, [data, gameInfo]);

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

  const renderContent = (): React.ReactElement => {
    switch (gameInfo.stage) {
      case 'attendance':
        return <Fans />;
      case 'weather':
        return <Weather />;
      case 'journeymen':
        return <Journeymen />;
      case 'inducements':
        return <Inducements />;
      case 'prayersToNuffle':
        return <PrayersToNuffle />;
      case 'play':
        return <Play />;
      case 'complete':
        return <Submit />;
    }
    return <>Something went wrong!</>;
  };

  return (
    <gameContext.Provider value={contextValue}>
      {renderContent()}
    </gameContext.Provider>
  );
}

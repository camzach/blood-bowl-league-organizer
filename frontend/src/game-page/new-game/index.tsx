import React from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PregameInfoQuery } from './queries/team-values.query.gen';
import { usePregameInfoQuery } from './queries/team-values.query.gen';
import type { TeamTablePlayerFragment } from '../../team-table/team.fragment.gen';
import type { RosterPlayersFragment } from './queries/roster.query.gen';
import type { InducementFragment } from './queries/inducements.query.gen';
import { Inducements } from './inducements';
import { Fans } from './fans';
import { Weather } from './weather';
import { Journeymen } from './journeymen';
import { PrayersToNuffle } from './prayers-to-nuffle';

type Team = {
  name: string;
  race: string;
  players: {
    roster: TeamTablePlayerFragment[];
    stars: InducementFragment['starPlayers'];
    journeymen: RosterPlayersFragment['players'];
  };
  inducements: InducementFragment;
  treasury: number;
  currentTeamValue: number;
  specialRules: string[];
  fans: number;
  fanFactor: number;
};
type GameInfo = {
  home: Team;
  away: Team;
  weather: string;
  stage: 'attendance' | 'weather' | 'journeymen' | 'inducements' | 'prayersToNuffle' | 'play';
};
type InducementActionContents = InducementFragment & { basic: Array<{ count: number }>; totalCost: number };
type Action =
  | { type: 'initialize'; home: Team; away: Team }
  | { type: 'fans'; home: number; away: number }
  | { type: 'weather'; weather: string }
  | { type: 'journeymen' } & Record<'home' | 'away', Team['players']['journeymen']>
  | { type: 'inducements'; home: InducementActionContents; away: InducementActionContents }
  | { type: 'prayersToNuffle' };
const emptyTeam: GameInfo['home' | 'away'] = {
  name: '',
  race: '',
  players: {
    roster: [],
    stars: [],
    journeymen: [],
  },
  inducements: { basic: [], wizards: [], starPlayers: [] },
  specialRules: [],
  treasury: 0,
  currentTeamValue: 0,
  fans: 0,
  fanFactor: 0,
};
const emptyGame: GameInfo = {
  stage: 'attendance',
  weather: '',
  home: emptyTeam,
  away: emptyTeam,
};
type ContextType = { dispatch: React.Dispatch<Action>; gameInfo: GameInfo };
export const gameContext = React.createContext<ContextType>({
  gameInfo: emptyGame,
  dispatch: p => p,
});

export function NewGame(): React.ReactElement {
  const [searchParams] = useSearchParams();
  const home = searchParams.get('home') ?? '';
  const away = searchParams.get('away') ?? '';

  const { isLoading, isError, data } = usePregameInfoQuery({ home, away });
  const [gameInfo, dispatch] = React.useReducer((state: GameInfo, action: Action) => {
    const newState = { ...state };
    switch (action.type) {
      case 'initialize':
        newState.home = action.home;
        newState.away = action.away;
        break;
      case 'fans':
        newState.home.fanFactor = action.home;
        newState.away.fanFactor = action.home;
        newState.stage = 'weather';
        break;
      case 'weather':
        newState.weather = action.weather;
        newState.stage = 'journeymen';
        break;
      case 'journeymen':
        newState.home.players.journeymen = action.home;
        newState.home.currentTeamValue += action.home.reduce((total, player) => total + player.cost, 0);
        newState.away.players.journeymen = action.away;
        newState.away.currentTeamValue += action.away.reduce((total, player) => total + player.cost, 0);
        newState.stage = 'inducements';
        break;
      case 'inducements':
        newState.home.players.stars = action.home.starPlayers;
        newState.home.inducements = action.home;
        newState.home.currentTeamValue += action.home.totalCost;
        newState.away.players.stars = action.away.starPlayers;
        newState.away.inducements = action.away;
        newState.away.currentTeamValue += action.away.totalCost;
        newState.stage = 'prayersToNuffle';
        break;
      case 'prayersToNuffle':
        newState.stage = 'play';
    }
    return newState;
  }, emptyGame);
  const contextValue = React.useMemo(() => ({ gameInfo, dispatch }), [gameInfo, dispatch]);

  React.useEffect(() => {
    if (!data?.home || !data.away) return;
    const teamToContextTeam = (team: NonNullable<PregameInfoQuery['home' | 'away']>): Team => ({
      name: team.name,
      race: team.race,
      fans: team.fans,
      fanFactor: 0,
      treasury: team.treasury,
      inducements: { basic: [], wizards: [], starPlayers: [] },
      currentTeamValue: team.teamValue.current,
      players: { roster: team.players, stars: [], journeymen: [] },
      specialRules: team.specialRules,
    });
    dispatch({
      type: 'initialize',
      home: teamToContextTeam(data.home),
      away: teamToContextTeam(data.away),
    });
  }, [data?.away, data?.home]);

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
        return <>Play Game</>;
    }
    return <>Something went wrong!</>;
  };

  return (
    <gameContext.Provider value={contextValue}>
      {renderContent()}
      <div style={{ display: 'flex', justifyContent: 'space-evenly' }}>
        <pre>{JSON.stringify(gameInfo.home, null, 2)}</pre>
        <pre>{JSON.stringify(gameInfo.away, null, 2)}</pre>
      </div>
    </gameContext.Provider>
  );
}

import React from 'react';
import type { TeamTablePlayerFragment } from '../../team-table/team.fragment.gen';
import type { InducementFragment } from './queries/inducements.query.gen';
import type { RosterPlayersFragment } from './queries/roster.query.gen';

export const sppOptions = [
  'Touchdown',
  'Completion',
  'Deflection',
  'Interception',
  'Casualty',
  'Perfect Passing (Nuffle Table)',
  'Necessary Violence (Nuffle Table)',
  'Fan Interaction (Nuffle Table)',
  'Fouling Frenzy (Nuffle Table)',
];
export const injuryOptions = [
  'Miss Next Game',
  'Niggling Injury',
  '-1 MA',
  '-1 PA',
  '-1 AG',
  '-1 ST',
  '-1 AV',
  'Dead',
];

type ContextTeam = {
  name: string;
  race: string;
  players: {
    roster: TeamTablePlayerFragment[];
    starPlayers: InducementFragment['starPlayers'];
    journeymen: RosterPlayersFragment['players'];
  };
  inducements: InducementFragment;
  treasury: number;
  currentTeamValue: number;
  specialRules: string[];
  fans: number;
  fanFactor: number;
};

export type GameInfo = {
  home: ContextTeam;
  away: ContextTeam;
  weather: string;
  stage: 'attendance' | 'weather' | 'journeymen' | 'inducements' | 'prayersToNuffle' | 'play';
  results: {
    touchdowns: { home: number; away: number };
    casualties: { home: number; away: number };
    playerUpdates: Partial<Record<string, { spp: string[]; cas: string[] }>>;
  };
};
const emptyTeam: GameInfo['home' | 'away'] = {
  name: '',
  race: '',
  players: {
    roster: [],
    starPlayers: [],
    journeymen: [],
  },
  inducements: { basic: [], wizards: [], starPlayers: [] },
  specialRules: [],
  treasury: 0,
  currentTeamValue: 0,
  fans: 0,
  fanFactor: 0,
};
export const emptyGame: GameInfo = {
  stage: 'attendance',
  weather: '',
  home: emptyTeam,
  away: emptyTeam,
  results: {
    touchdowns: { home: 0, away: 0 },
    casualties: { home: 0, away: 0 },
    playerUpdates: {},
  },
};

type InducementActionContents = InducementFragment & { basic: Array<{ count: number }>; totalCost: number };
type Action =
  | { type: 'initialize'; home: ContextTeam; away: ContextTeam }
  | { type: 'fans'; home: number; away: number }
  | { type: 'weather'; weather: string }
  | { type: 'journeymen' } & Record<'home' | 'away', ContextTeam['players']['journeymen']>
  | { type: 'inducements'; home: InducementActionContents; away: InducementActionContents }
  | { type: 'prayersToNuffle' }
  | { type: 'results'; results: GameInfo['results'] };
export const reducer = (state: GameInfo, action: Action): GameInfo => {
  const newState = { ...state };
  switch (action.type) {
    case 'initialize':
      newState.home = action.home;
      newState.away = action.away;
      newState.stage = 'attendance';
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
      newState.home.players.starPlayers = action.home.starPlayers;
      newState.home.inducements = action.home;
      newState.home.currentTeamValue += action.home.totalCost;
      newState.away.players.starPlayers = action.away.starPlayers;
      newState.away.inducements = action.away;
      newState.away.currentTeamValue += action.away.totalCost;
      newState.stage = 'prayersToNuffle';
      break;
    case 'prayersToNuffle':
      newState.stage = 'play';
      break;
    case 'results':
      newState.results = action.results;
  }
  return newState;
};
type ContextType = { dispatch: React.Dispatch<Action>; gameInfo: GameInfo };
export const gameContext = React.createContext<ContextType>({
  gameInfo: emptyGame,
  dispatch: p => p,
});

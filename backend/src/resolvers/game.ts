import type { GameResolvers, QueryResolvers } from '../graphql.gen';
import teams from '../teams.json';
import games from '../games.json';

export const GameQueries: QueryResolvers = {
  games: () => {
    console.log('resolving games');
    return games;
  },
};

export const Game: GameResolvers = {
  homeTeam: parent => {
    const home = teams.find(team => team.id === parent.homeId);
    if (!home) throw new Error('Unable to locate home team');
    return home;
  },
  awayTeam: parent => {
    const away = teams.find(team => team.id === parent.awayId);
    if (!away) throw new Error('Unable to locate away team');
    return away;
  },
};

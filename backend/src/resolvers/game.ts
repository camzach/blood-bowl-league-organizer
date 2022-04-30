import type { GameResolvers, QueryResolvers } from '../graphql.gen';
import teams from '../teams.json';
import games from '../games.json';

export const GameQueries: QueryResolvers = {
  games: () => games,
  game: (parent, query) => {
    const homeId = teams.find(t => t.name === query.home)?.id;
    const awayId = teams.find(t => t.name === query.away)?.id;
    const game = games.find(g => g.homeId === homeId && g.awayId === awayId);
    if (!game) throw new Error('Could not find game');
    return game;
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

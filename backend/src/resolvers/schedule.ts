import type { QueryResolvers, ScheduledGameResolvers } from '../graphql.gen';
import teams from '../teams.json';
import games from '../games.json';
import schedule from '../schedule.json';

const Query: QueryResolvers = {
  schedule: () => ({
    rounds: schedule.map(round => ({
      games: round.map(g => {
        const game = games.find(someGame => someGame.homeId === g.homeId && someGame.awayId === g.awayId);
        return game ? { __typename: 'Game', ...game } : { __typename: 'ScheduledGame', ...g };
      }),
    })),
  }),
};

const ScheduledGame: ScheduledGameResolvers = {
  homeTeam: parent => {
    const team = teams.find(t => parent.homeId === t.id);
    if (!team) throw new Error('Couldn\'t find home team');
    return team;
  },
  awayTeam: parent => {
    const team = teams.find(t => parent.awayId === t.id);
    if (!team) throw new Error('Couldn\'t find away team');
    return team;
  },
};

export { Query, ScheduledGame };

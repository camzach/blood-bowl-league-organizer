/* eslint-disable no-underscore-dangle */
import type {
  GameDbObject,
  QueryResolvers,
  ScheduleDbObject,
  ScheduleSlotResolvers,
  TeamDbObject,
} from '../graphql.gen';

const Query: QueryResolvers = {
  schedule: async(parent, query, context) => {
    const schedule = await context.db.collection('schedule').findOne<ScheduleDbObject>({});
    if (!schedule) throw new Error('Unable to find schedule');
    return {
      rounds: await Promise.all(schedule.rounds.map(async round => ({
        games: await Promise.all(round.games.map(async g => {
          const game = await context.db.collection('games')
            .findOne<GameDbObject>({ homeTeam: g.homeTeam, awayTeam: g.awayTeam });
          return { homeTeam: g.homeTeam, awayTeam: g.awayTeam, game };
        })),
      }))),
    };
  },
};

const ScheduleSlot: ScheduleSlotResolvers = {
  homeTeam: async(parent, query, context) => {
    const team = await context.db.collection('teams').findOne<TeamDbObject>({ _id: parent.homeTeam });
    if (!team) throw new Error('Couldn\'t find home team');
    return team;
  },
  awayTeam: async(parent, query, context) => {
    const team = await context.db.collection('teams').findOne<TeamDbObject>({ _id: parent.awayTeam });
    if (!team) throw new Error('Couldn\'t find home team');
    return team;
  },
};

export { Query, ScheduleSlot };

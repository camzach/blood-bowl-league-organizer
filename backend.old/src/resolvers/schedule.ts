/* eslint-disable no-underscore-dangle */
import { ObjectId } from 'mongodb';
import type {
  GameDbObject,
  MutationResolvers,
  QueryResolvers,
  ScheduleDbObject,
  ScheduleSlotResolvers,
  TeamDbObject,
} from '../graphql.gen';
import { withTransaction } from './utils';

const Query: QueryResolvers = {
  schedule: async(parent, query, context) => {
    const schedule = await context.db.collection('schedule').findOne<ScheduleDbObject>({});
    if (!schedule) throw new Error('Unable to find schedule');
    return schedule;
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
  game: async(parent, query, context) => {
    if (!parent.game) return null;
    const game = await context.db.collection('games')
      .findOne<GameDbObject>({ _id: parent.game });
    if (!game) throw new Error('Some game not found');
    return game;
  },
};

const Mutation: MutationResolvers = {
  playGame: async(parent, query, context) => {
    const schedule = await context.db.collection('schedule').findOne<ScheduleDbObject>({});
    if (!schedule) throw new Error('No schedule found');
    if (query.round < 0 || query.round >= schedule.rounds.length) throw new Error('Invalid round specified');
    const round = schedule.rounds[query.round];
    const homeId = new ObjectId(query.homeTeam);
    const awayId = new ObjectId(query.awayTeam);
    const game = round.games.find(g =>
      g.homeTeam.equals(homeId) &&
      g.awayTeam.equals(awayId));
    if (!game) throw new Error('Teams not scheduled to play in the specified round');
    if (game.game) throw new Error('Game already recorded');
    const newGame: GameDbObject = {
      _id: new ObjectId(),
      homeTeam: homeId,
      awayTeam: awayId,
      casHome: 0,
      casAway: 0,
      tdHome: 0,
      tdAway: 0,
      ffHome: 0,
      ffAway: 0,
      winningsAway: 0,
      winningsHome: 0,
    };
    await withTransaction(context.client, async() => {
      game.game = newGame._id;
      await context.db.collection('schedule').replaceOne({ _id: schedule._id }, schedule);
      await context.db.collection('games').insertOne(newGame);
    });
    return { success: true };
  },
};

export { Query, Mutation, ScheduleSlot };

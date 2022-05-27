/* eslint-disable no-underscore-dangle */
import { ObjectId } from 'mongodb';
import type { GameDbObject, GameResolvers, QueryResolvers, TeamDbObject } from '../graphql.gen';

const Query: QueryResolvers = {
  games: async(parent, query, context) => context.db.collection('games').find<GameDbObject>({}).toArray(),
  game: async(parent, query, context) => {
    const game = await context.db.collection('games')
      .findOne<GameDbObject>({ _id: new ObjectId(query.id) });
    if (!game) throw new Error('Could not find game');
    return game;
  },
};

const Game: GameResolvers = {
  id: parent => parent._id.toHexString(),
  homeTeam: async(parent, query, context) => {
    const home = await context.db.collection('teams').findOne<TeamDbObject>({ _id: parent.homeTeam });
    if (!home) throw new Error('Unable to locate home team');
    return home;
  },
  awayTeam: async(parent, query, context) => {
    const away = await context.db.collection('teams').findOne<TeamDbObject>({ _id: parent.awayTeam });
    if (!away) throw new Error('Unable to locate away team');
    return away;
  },
};

export { Game, Query };

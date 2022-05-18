import type { QueryResolvers, RosterDbObject, RosterResolvers } from '../graphql.gen';

export const Roster: RosterResolvers = {};

export const Query: QueryResolvers = {
  rosters: async(parent, query, context) => context.db.collection('rosters').find<RosterDbObject>({}).toArray(),
  roster: async(parent, query, context) =>
    context.db.collection('rosters').findOne<RosterDbObject>({ name: query.name }),
};

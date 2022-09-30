/* eslint-disable no-underscore-dangle */
import type {
  QueryResolvers,
  RosterDbObject,
  RosterPlayerResolvers,
  RosterResolvers,
  SkillDbObject,
} from '../graphql.gen';

export const Roster: RosterResolvers = {};

export const RosterPlayer: RosterPlayerResolvers = {
  skills: async(parent, query, context) => context.db.collection('skills')
    .aggregate<SkillDbObject>([
    { $match: { _id: { $in: parent.skills } } },
    { $addFields: { __order: { $indexOfArray: [parent.skills, '$_id'] } } },
    { $sort: { __order: 1 } },
  ])
    .toArray(),
};

export const Query: QueryResolvers = {
  rosters: async(parent, query, context) => context.db.collection('rosters').find<RosterDbObject>({}).toArray(),
  roster: async(parent, query, context) =>
    context.db.collection('rosters').findOne<RosterDbObject>({ name: query.name }),
};

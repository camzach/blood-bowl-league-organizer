/* eslint-disable no-underscore-dangle */
import type {
  QueryResolvers,
  RosterDbObject,
  RosterPlayerResolvers,
  RosterResolvers,
} from '../graphql.gen';
import { getModifiedSkills } from './utils';

export const Roster: RosterResolvers = {};

export const RosterPlayer: RosterPlayerResolvers = {
  skills: async(parent, query, context) =>
    // Newline for spacing
    getModifiedSkills(parent.skills, context.db.collection('skills'))
  ,
};

export const Query: QueryResolvers = {
  rosters: async(parent, query, context) => context.db.collection('rosters').find<RosterDbObject>({}).toArray(),
  roster: async(parent, query, context) =>
    context.db.collection('rosters').findOne<RosterDbObject>({ name: query.name }),
};

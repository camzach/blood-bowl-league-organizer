import type { QueryResolvers, RosterResolvers } from '../graphql.gen';
import rosters from '../rosters.json';

export const Roster: RosterResolvers = {};

export const Query: QueryResolvers = {
  rosters: () => rosters,
  roster: (parent, query) => rosters.find(roster => roster.name === query.name) ?? null,
};

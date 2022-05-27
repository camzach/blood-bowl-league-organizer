/* eslint-disable no-underscore-dangle */
import type { Filter } from 'mongodb';
import { ObjectId } from 'mongodb';
import type {
  PlayerDbObject,
  QueryResolvers,
  RosterDbObject,
  TeamDbObject,
  TeamResolvers,
} from '../graphql.gen';

import { getPlayerValue } from './utils';

const Query: QueryResolvers = {
  team: async(parent, query, context) => {
    const team = await context.db.collection('teams').findOne<TeamDbObject>({ _id: new ObjectId(query.id) });
    if (!team) return null;
    return team;
  },
  teams: async(parent, query, context) => context.db.collection('teams').find<TeamDbObject>({}).toArray(),
};

const Team: TeamResolvers = {
  id: parent => parent._id.toHexString(),
  players: async(parent, query, context) => {
    const mongoQuery: Filter<PlayerDbObject> = { team: parent._id };
    // @ts-expect-error: injuries.missNextGame is a sub-document query, the types don't know about this
    if (typeof query.missNextGame === 'boolean') mongoQuery['injuries.missNextGame'] = query.missNextGame;
    const teamPlayers = await context.db.collection('players')
      .find<PlayerDbObject>(mongoQuery)
      .toArray();
    return teamPlayers;
  },
  teamValue: async(parent, query, context) => {
    const teamPlayers = await context.db.collection('players')
      .find<PlayerDbObject>({ team: parent._id })
      .toArray();
    const roster = await context.db.collection('rosters').findOne<RosterDbObject>({ _id: parent.race });
    if (!roster) throw new Error('Unable to locate team roster');
    const playerValues = teamPlayers
      .reduce((prev, player) => {
        const { base, current } = getPlayerValue(player, roster);
        return { base: base + prev.base, current: current + prev.current };
      }, { base: 0, current: 0 });
    const staffValue =
      (parent.apothecary ? 50000 : 0) +
      ((parent.cheerleaders + parent.coaches) * 10000) +
      (parent.rerolls * roster.rerollCost);
    const uninjuredPlayerCount = teamPlayers.filter(p => !p.injuries.missNextGame).length;
    if (uninjuredPlayerCount < 11) {
      // The team takes on journeymen
      const journeymanCost = roster.players.find(p => p.max >= 12)?.cost;
      if (journeymanCost === undefined) throw new Error('Unable to find journeymen for the team');
      playerValues.current += journeymanCost * (11 - uninjuredPlayerCount);
    }
    return { base: playerValues.base + staffValue, current: playerValues.current + staffValue };
  },
  race: async(parent, query, context) => {
    const roster = await context.db.collection('rosters').findOne<RosterDbObject>({ _id: parent.race });
    if (!roster) throw new Error('Unknown roster');
    return roster;
  },
};

export { Team, Query };

/* eslint-disable no-underscore-dangle */
import type { Filter } from 'mongodb';
import { ObjectId } from 'mongodb';
import type {
  MutationResolvers,
  PlayerDbObject,
  QueryResolvers,
  RosterDbObject,
  TeamDbObject,
  TeamResolvers,
} from '../graphql.gen';

import { getPlayerValue, withTransaction } from './utils';

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
    const mongoQuery: Filter<PlayerDbObject> = { _id: { $in: parent.players } };
    if (typeof query.missNextGame === 'boolean') mongoQuery['injuries.missNextGame'] = query.missNextGame;
    const teamPlayers = await context.db.collection('players')
      .find<PlayerDbObject>(mongoQuery)
      .toArray();
    return teamPlayers;
  },
  hireableJourneymen: async(parent, query, context) => context.db.collection('players')
    .find<PlayerDbObject>({ _id: { $in: parent.hireableJourneymen } })
    .toArray(),
  teamValue: async(parent, query, context) => {
    const teamPlayers = await context.db.collection('players')
      .find<PlayerDbObject>({ team: parent._id })
      .toArray();
    const roster = await context.db.collection('rosters').findOne<RosterDbObject>({ _id: parent.race });
    if (!roster) throw new Error('Unable to locate team roster');
    const playerValues = await teamPlayers
      .reduce(async(prev, player) => {
        const p = await prev;
        const { base, current } = await getPlayerValue(player, context.db);
        return { base: base + p.base, current: current + p.current };
      }, Promise.resolve({ base: 0, current: 0 }));
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

const Mutation: MutationResolvers = {
  hirePlayer: async(parent, query, context) => {
    if (query.number < 1 || query.number > 16) throw new Error('Number should be in the range [1, 16]');
    const teamId = new ObjectId(query.teamId);
    const team = await context.db.collection('teams').findOne<TeamDbObject>({ _id: teamId });
    if (!team) throw new Error('Team not found');
    const teamPlayers = await context.db.collection('players')
      .find<PlayerDbObject>({ _id: { $in: team.players } })
      .toArray();
    if (teamPlayers.some(p => p.number === query.number))
      throw new Error('A player on the team already has this number');
    const rosterId = new ObjectId(team.race);
    const roster = await context.db.collection('rosters').findOne<RosterDbObject>({ _id: rosterId });
    if (!roster) throw new Error('Roster not found');
    const player = roster.players.find(p => p.position === query.position);
    if (!player) throw new Error('Position not found');
    if (team.treasury < player.cost) throw new Error('Cannot afford this player');
    const newPlayer: PlayerDbObject = {
      _id: new ObjectId(),
      position: player.position,
      number: query.number,
      team: teamId,
      progression: [],
      skills: [],
      starPlayerPoints: {
        MVPs: 0,
        casualties: 0,
        completions: 0,
        deflections: 0,
        interceptions: 0,
        prayersToNuffle: 0,
        touchdowns: 0,
      },
      injuries: {
        AG: 0,
        AV: 0,
        MA: 0,
        PA: 0,
        ST: 0,
        missNextGame: false,
        niggles: 0,
      },
      improvements: {
        AG: 0,
        AV: 0,
        MA: 0,
        PA: 0,
        ST: 0,
      },
      AG: player.AG,
      AV: player.AV,
      MA: player.MA,
      PA: player.PA ?? null,
      ST: player.ST,
    };
    await withTransaction(context.client, async() => {
      await context.db.collection('players').insertOne(newPlayer);
      const teamUpdate = {
        $set: {
          treasury: team.treasury - player.cost,
          players: [...teamPlayers.map(p => p._id), newPlayer._id],
        },
      };
      await context.db.collection('teams').updateOne({ _id: teamId }, teamUpdate);
    });
    return { success: true };
  },
  hireJourneyman: async(parent, query, context) => {
    const playerId = new ObjectId(query.playerId);
    const teamId = new ObjectId(query.teamId);

    const player = await context.db.collection('players').findOne<PlayerDbObject>({ _id: playerId });
    if (!player) throw new Error('Player not found');
    if (!player.team.equals(teamId)) throw new Error('Player does not belong to this team');
    const team = await context.db.collection('teams').findOne<TeamDbObject>({ _id: teamId });
    if (!team) throw new Error('Team not found');
    if (team.players.length >= 16) throw new Error('Team roster full');
    if (team.players.some(p => p.equals(playerId))) throw new Error('Player already on this team');
    const teamPlayers = await context.db.collection('players')
      .find<PlayerDbObject>({ _id: { $in: team.players } })
      .toArray();
    if (teamPlayers.some(p => p.number === query.number))
      throw new Error('Player on this team already has this number');
    const { hiringFee, improvements } = await getPlayerValue(player, context.db);
    const cost = hiringFee + improvements;
    if (cost > team.treasury) throw new Error('Team cannot afford this player');

    await withTransaction(context.client, async() => {
      team.players.push(playerId);
      team.hireableJourneymen = team.hireableJourneymen.filter(id => !id.equals(playerId));
      team.treasury -= cost;
      await context.db.collection('players').updateOne({ _id: playerId }, { $set: { number: query.number } });
      await context.db.collection('teams').updateOne({ _id: teamId }, {
        $set: {
          players: team.players,
          hireableJourneymen: team.hireableJourneymen,
          treasury: team.treasury,
        },
      });
    });

    return { success: true };
  },
};

export { Team, Query, Mutation };

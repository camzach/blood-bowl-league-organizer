import type { PlayerDbObject, PlayerResolvers, QueryResolvers, RosterDbObject, TeamDbObject } from '../graphql.gen';
import { getPlayerValue } from './utils';

const Player: PlayerResolvers = {
  team: async(parent, query, context) => {
    // eslint-disable-next-line no-underscore-dangle
    const team = await context.db.collection('teams').findOne<TeamDbObject>({ _id: parent._id });
    if (!team) return null as never;
    return team;
  },
  stats: async(parent, query, context) => {
    const roster = await context.db.collection('rosters')
      .findOne<RosterDbObject>({ players: { $elemMatch: { position: parent.position } } });
    const basePlayer = roster?.players.find(p => p.position === parent.position);
    if (!basePlayer) throw new Error('Unable to find base player');
    const positiveImprovements = Object.fromEntries((['MA', 'ST', 'AV'] as const)
      .map(stat => [
        stat,
        basePlayer[stat] + parent.improvements[stat] - parent.injuries[stat],
      ]));
    const negativeImprovements = Object.fromEntries((['PA', 'AG'] as const)
      .map(stat => [
        stat,
        (typeof basePlayer[stat] === 'number'
          ? (basePlayer[stat] as number) + parent.injuries[stat] - parent.improvements[stat]
          : null),
      ]));
    return {
      ...positiveImprovements as Record<'MA' | 'ST' | 'AV', number>,
      ...negativeImprovements as { PA: number | null; AG: number },
    };
  },
  skills: async(parent, query, context) => {
    const rosterQuery = { players: { $elemMatch: { position: parent.position } } };
    const roster = await context.db.collection('rosters').findOne<RosterDbObject>(rosterQuery);
    const basePlayer = roster?.players.find(p => p.position === parent.position);
    if (!basePlayer || !roster) throw new Error('Unable to find base player');
    return [...basePlayer.skills, ...parent.skills];
  },
  teamValue: async(parent, query, context) => {
    const rosterQuery = { players: { $elemMatch: { position: parent.position } } };
    const roster = await context.db.collection('rosters').findOne<RosterDbObject>(rosterQuery);
    if (!roster) throw new Error('Unable to match player to any roster');
    return getPlayerValue(parent, roster);
  },
  casualties: parent => ({ missNextGame: parent.injuries.missNextGame, niggles: parent.injuries.niggles }),
};

const Query: QueryResolvers = {
  player: async(parent, query, context) => {
    const player = await context.db.collection('players').findOne<PlayerDbObject>({ name: query.name });
    if (!player) return null;
    return player;
  },
};

export { Player, Query };

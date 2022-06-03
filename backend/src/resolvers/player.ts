/* eslint-disable no-underscore-dangle */
import type {
  PlayerDbObject,
  PlayerResolvers,
  QueryResolvers,
  RosterDbObject,
  TeamDbObject,
} from '../graphql.gen';
import { getModifiedSkills, getPlayerValue } from './utils';

const Player: PlayerResolvers = {
  id: parent => parent._id.toHexString(),
  team: async(parent, query, context) => {
    const team = await context.db.collection('teams').findOne<TeamDbObject>({ _id: parent.team });
    if (!team) throw new Error('Unable to find team for player');
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
    return getModifiedSkills([...basePlayer.skills, ...parent.skills], context.db.collection('skills'));
  },
  teamValue: async(parent, query, context) => {
    const rosterQuery = { players: { $elemMatch: { position: parent.position } } };
    const roster = await context.db.collection('rosters').findOne<RosterDbObject>(rosterQuery);
    if (!roster) throw new Error('Unable to match player to any roster');
    return getPlayerValue(parent, roster);
  },
  casualties: parent => ({ missNextGame: parent.injuries.missNextGame, niggles: parent.injuries.niggles }),
  starPlayerPoints: ({ starPlayerPoints, progression }) => {
    const advancements = {
      'Random Primary': [3, 4, 6, 8, 10, 15],
      'Chosen Primary': [6, 8, 12, 16, 20, 30],
      'Random Secondary': [6, 8, 12, 16, 20, 30],
      'Chosen Secondary': [12, 14, 18, 22, 26, 40],
      'Characteristic Improvement': [18, 20, 24, 28, 32, 50],
    };
    const total =
      (starPlayerPoints.MVPs * 4) +
      (starPlayerPoints.touchdowns * 3) +
      (starPlayerPoints.casualties * 2) +
      (starPlayerPoints.deflections) +
      (starPlayerPoints.completions) +
      (starPlayerPoints.interceptions) +
      (starPlayerPoints.prayersToNuffle);
    const current = total - progression.reduce((cost, prog, idx) =>
      cost + advancements[prog as keyof typeof advancements][idx], 0);
    return {
      ...starPlayerPoints,
      total,
      current,
    };
  },
};

const Query: QueryResolvers = {
  player: async(parent, query, context) => {
    const player = await context.db.collection('players').findOne<PlayerDbObject>({ name: query.name });
    if (!player) return null;
    return player;
  },
};

export { Player, Query };

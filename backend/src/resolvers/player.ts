import type { PlayerResolvers, QueryResolvers } from '../graphql.gen';
import teams from '../teams.json';
import players from '../players.json';
import rosters from '../rosters.json';
import type { PlayerModel } from '../models/player';
import { getBasePlayer, getPlayerValue } from './utils';

const Player: PlayerResolvers = {
  team: parent => {
    const team = teams.find(t => t.id === parent.teamId);
    if (!team) return null as never;
    return team;
  },
  ...Object.fromEntries((['MA', 'ST', 'AV'] as const).map(stat => [
    stat,
    (parent: PlayerModel): number => getBasePlayer(parent)[stat] + parent.improvements[stat] - parent.injuries[stat],
  ])),
  ...Object.fromEntries((['PA', 'AG'] as const).map(stat => [
    stat,
    (parent: PlayerModel): number | null => {
      const baseStat = getBasePlayer(parent)[stat];
      if (typeof baseStat !== 'number') return null;
      return baseStat + parent.injuries[stat] - parent.improvements[stat];
    },
  ])),
  skills: (parent): string[] => {
    const basePlayer = Object.values(rosters)
      .flatMap(roster => roster.players)
      .find(player => player.position === parent.position);
    if (!basePlayer) throw new Error('Player position not recognized.');
    return [...basePlayer.skills];
  },
  teamValue: getPlayerValue,
  casualties: parent => ({ missNextGame: parent.injuries.missNextGame, niggles: parent.injuries.niggles }),
};

const Query: QueryResolvers = {
  player: (parent, query) => {
    const player = players.find(p => p.name === query.name);
    if (!player) return null;
    return player;
  },
};

export { Player, Query };

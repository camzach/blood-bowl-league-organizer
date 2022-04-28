import type { PlayerResolvers, Player as PlayerType, QueryResolvers } from '../graphql.gen';
import teams from '../teams.json';
import players from '../players.json';
import rosters from '../rosters.json';
import type { PlayerModel } from '../models';

function getBasePlayer(player: PlayerModel): (typeof rosters)[keyof (typeof rosters)]['players'][number] {
  const basePlayer = Object.values(rosters)
    .flatMap(roster => roster.players)
    .find(p => p.position === player.position);
  if (!basePlayer) throw new Error('Player position not recognized');
  return basePlayer;
}

export const Player: PlayerResolvers = {
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
      if (baseStat === null) return null;
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
  teamValue: (parent): PlayerType['teamValue'] => {
    const basePlayer = getBasePlayer(parent);
    let base = basePlayer.cost;
    for (const progression of parent.progression) {
      switch (progression) {
        case 'AV':
        case 'Random Primary':
          base += 10000;
          break;
        case 'MA':
        case 'PA':
        case 'Chosen Primary':
        case 'Random Secondary':
          base += 20000;
          break;
        case 'Chosen Secondary':
        case 'AG':
          base += 40000;
          break;
        case 'ST':
          base += 80000;
          break;
      }
      base += 0 as never;
    }
    const baseTeam = Object.values(rosters).find(roster =>
      roster.players.some(player => player.position === parent.position));
    if (!baseTeam) throw new Error('Player position not recognized');
    const noCurrentCost =
      (baseTeam.specialRules.includes('Low Cost Linemen') && basePlayer.max >= 12) ||
      parent.injuries.missNextGame;
    return { base, current: noCurrentCost ? 0 : base };
  },
  casualties: parent => ({ missNextGame: parent.injuries.missNextGame, niggles: parent.injuries.niggles }),
};

export const PlayerQueries: QueryResolvers = {
  player: (parent, query) => {
    const player = players.find(p => p.name === query.name);
    if (!player) return null;
    return player;
  },
};

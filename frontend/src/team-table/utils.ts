import type teams from '../data/teams.json';
import type { Player } from 'globals';

type ValueOf<T> = T[keyof T];
type BasePlayer = ValueOf<typeof teams>['players'][number];

export function getPlayerTeamValue(basePlayer: BasePlayer, player: Player): number {
  const progressionCost = player.progression.map((progression): number => {
    switch (progression) {
      case 'AV':
      case 'Random Primary':
        return 10000;
      case 'MA':
      case 'PA':
      case 'Chosen Primary':
      case 'Random Secondary':
        return 20000;
      case 'Chosen Secondary':
      case 'AG':
        return 40000;
      case 'ST':
        return 80000;
    }
    return 0 as never;
  }).reduce((a, b) => a + b, 0);
  return basePlayer.cost + progressionCost;
}

export function getPlayerCurrentTeamValue(basePlayer: BasePlayer, player: Player, team: ValueOf<typeof teams>): number {
  if (
    player.injuries.missNextGame ||
    (team.specialRules.includes('Low Cost Linemen') && basePlayer.max >= 12)
  ) return 0;
  return getPlayerTeamValue(basePlayer, player);
}

type Stat = 'AG' | 'AV' | 'MA' | 'PA' | 'ST';
export function getModifiedStats(
  base: Record<Stat, number | null>,
  injuries: Player['injuries'],
  improvements: Player['improvements']
): Record<Stat, number | null> {
  const entries = Object.entries(base) as Array<[Stat, number | null]>;
  const mapped = entries.map(([stat, value]): [Stat, number | null] => {
    if (value === null) return [stat, null];
    switch (stat) {
      case 'MA':
      case 'AV':
      case 'ST':
        return [stat, value + improvements[stat] + injuries[stat]];
      case 'PA':
      case 'AG':
        return [stat, value - improvements[stat] + injuries[stat]];
    }
    return 0 as never;
  });
  return Object.fromEntries(mapped) as Record<Stat, number>;
}

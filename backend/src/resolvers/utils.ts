import type { Player } from '../graphql.gen';
import rosters from '../rosters.json';
import type { PlayerModel } from '../models/player';

export function getBasePlayer(player: PlayerModel): (typeof rosters)[keyof (typeof rosters)]['players'][number] {
  const basePlayer = Object.values(rosters)
    .flatMap(roster => roster.players)
    .find(p => p.position === player.position);
  if (!basePlayer) throw new Error('Player position not recognized');
  return basePlayer;
}

export function getPlayerValue(parent: PlayerModel): Player['teamValue'] {
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
}

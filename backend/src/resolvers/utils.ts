import type { PlayerDbObject, RosterDbObject, TeamValue } from '../graphql.gen';

export function getPlayerValue(parent: PlayerDbObject, roster: RosterDbObject): TeamValue {
  const basePlayer = roster.players.find(p => p.position === parent.position);
  if (!basePlayer) throw new Error('Player position not recognized');
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
  const noCurrentCost =
    (roster.specialRules.includes('Low Cost Linemen') && basePlayer.max >= 12) ||
    parent.injuries.missNextGame;
  return { base, current: noCurrentCost ? 0 : base };
}

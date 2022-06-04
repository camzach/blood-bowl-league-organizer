import type { Db, ObjectId } from 'mongodb';
import type { PlayerDbObject, RosterDbObject, RosterPlayerDbObject, TeamValue } from '../graphql.gen';
import { ProgressionOption } from '../graphql.gen';

type PlayerInfoType = { player: PlayerDbObject; basePlayer: RosterPlayerDbObject; roster: RosterDbObject };
export async function getPlayerInfo(player: ObjectId | PlayerDbObject, db: Db): Promise<PlayerInfoType> {
  const resolvedPlayer = '_id' in player
    ? player
    : await db.collection('players').findOne<PlayerDbObject>({ _id: player });
  if (!resolvedPlayer) throw new Error('Player not found');
  const rosterQuery = { players: { $elemMatch: { position: resolvedPlayer.position } } };
  const roster = await db.collection('rosters').findOne<RosterDbObject>(rosterQuery);
  if (!roster) throw new Error('Player position does not exist on any roster');
  const basePlayer = roster.players.find(p => p.position === resolvedPlayer.position);
  if (!basePlayer) throw new Error('Unable to find base player');
  return { player: resolvedPlayer, basePlayer, roster };
}

export async function getPlayerValue(parent: PlayerDbObject, db: Db): Promise<TeamValue> {
  const { basePlayer, roster } = await getPlayerInfo(parent, db);
  const noHiringFee = (roster.specialRules.includes('Low Cost Linemen') && basePlayer.max >= 12);
  let cost = noHiringFee ? 0 : basePlayer.cost;
  for (const progression of parent.progression) {
    switch (progression) {
      case ProgressionOption.Av:
      case ProgressionOption.RandomPrimary:
        cost += 10000;
        break;
      case ProgressionOption.Ma:
      case ProgressionOption.Pa:
      case ProgressionOption.ChosenPrimary:
      case ProgressionOption.RandomSecondary:
        cost += 20000;
        break;
      case ProgressionOption.CharacteristicSecondary:
      case ProgressionOption.ChosenSecondary:
      case ProgressionOption.Ag:
        cost += 40000;
        break;
      case ProgressionOption.St:
        cost += 80000;
        break;
    }
    cost += 0 as never;
  }

  return { base: cost, current: parent.injuries.missNextGame ? 0 : cost };
}

import type { Db, MongoClient, ObjectId } from 'mongodb';
import type { PlayerDbObject, PlayerValue, RosterDbObject, RosterPlayerDbObject } from '../graphql.gen';
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

export async function getPlayerValue(parent: PlayerDbObject, db: Db): Promise<PlayerValue> {
  const { basePlayer, roster } = await getPlayerInfo(parent, db);

  let improvements = 0;
  for (const progression of parent.progression) {
    switch (progression) {
      case ProgressionOption.Av:
      case ProgressionOption.RandomPrimary:
        improvements += 10000;
        break;
      case ProgressionOption.Ma:
      case ProgressionOption.Pa:
      case ProgressionOption.ChosenPrimary:
      case ProgressionOption.RandomSecondary:
        improvements += 20000;
        break;
      case ProgressionOption.CharacteristicSecondary:
      case ProgressionOption.ChosenSecondary:
      case ProgressionOption.Ag:
        improvements += 40000;
        break;
      case ProgressionOption.St:
        improvements += 80000;
        break;
    }
    improvements += 0 as never;
  }
  const baseCost = (roster.specialRules.includes('Low Cost Linemen') && basePlayer.max >= 12)
    ? 0
    : basePlayer.cost;
  const teamValue = baseCost + improvements;
  const current = parent.injuries.missNextGame ? 0 : teamValue;

  return {
    hiringFee: basePlayer.cost,
    improvements,
    base: teamValue,
    current,
  };
}

export async function withTransaction(client: MongoClient, work: () => Promise<void>): Promise<void> {
  const session = client.startSession();
  try {
    session.startTransaction();
    await work();
    await session.commitTransaction();
  } catch (e) {
    await session.abortTransaction();
    await session.endSession();
    // This should be an Error, but either way I want to throw out exactly what MongoDB gave me
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    throw e;
  } finally {
    await session.endSession();
  }
}

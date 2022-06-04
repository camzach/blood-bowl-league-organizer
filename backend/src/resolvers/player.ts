/* eslint-disable no-underscore-dangle */
import { ObjectId } from 'mongodb';
import type {
  MutationResolvers,
  PlayerDbObject,
  PlayerResolvers,
  Player as PlayerType,
  QueryResolvers,
  RosterPlayerDbObject,
  SkillCategory,
  SkillDbObject,
  TeamDbObject,
} from '../graphql.gen';
import {
  CharacteristicImprovementPreference,
  ProgressionOption,
} from '../graphql.gen';
import { getPlayerInfo, getPlayerValue } from './utils';

const advancementCosts: Record<ProgressionOption, readonly number[]> = {
  [ProgressionOption.RandomPrimary]: [3, 4, 6, 8, 10, 15],
  [ProgressionOption.ChosenPrimary]: [6, 8, 12, 16, 20, 30],
  [ProgressionOption.RandomSecondary]: [6, 8, 12, 16, 20, 30],
  [ProgressionOption.ChosenSecondary]: [12, 14, 18, 22, 26, 40],
  [ProgressionOption.St]: [18, 20, 24, 28, 32, 50],
  [ProgressionOption.Ma]: [18, 20, 24, 28, 32, 50],
  [ProgressionOption.Ag]: [18, 20, 24, 28, 32, 50],
  [ProgressionOption.Pa]: [18, 20, 24, 28, 32, 50],
  [ProgressionOption.Av]: [18, 20, 24, 28, 32, 50],
  [ProgressionOption.CharacteristicSecondary]: [18, 20, 24, 28, 32, 50],
};

function calculateSPP(player: PlayerDbObject): PlayerType['starPlayerPoints'] {
  const { starPlayerPoints, progression } = player;
  const total =
    (starPlayerPoints.MVPs * 4) +
    (starPlayerPoints.touchdowns * 3) +
    (starPlayerPoints.casualties * 2) +
    (starPlayerPoints.deflections) +
    (starPlayerPoints.completions) +
    (starPlayerPoints.interceptions) +
    (starPlayerPoints.prayersToNuffle);
  const current = total - progression.reduce((cost, prog, idx) =>
    cost + advancementCosts[prog][idx], 0);
  return {
    ...starPlayerPoints,
    total,
    current,
  };
}

function calculateStats(
  basePlayer: RosterPlayerDbObject,
  parent: PlayerDbObject
): Omit<PlayerType['stats'], '__typename'> {
  const positiveImprovements = Object.fromEntries((['MA', 'ST', 'AV'] as const)
    .map(stat => [
      stat,
      basePlayer[stat] + parent.improvements[stat] - parent.injuries[stat],
    ]));
  const negativeImprovements = Object.fromEntries((['PA', 'AG'] as const)
    .map(stat => [
      stat,
      // eslint-disable-next-line no-nested-ternary
      (typeof basePlayer[stat] === 'number'
        ? (basePlayer[stat] as number) + parent.injuries[stat] - parent.improvements[stat]
        : (parent.improvements[stat] ? 6 + parent.injuries[stat] - parent.improvements[stat] : null)),
    ]));
  return {
    ...positiveImprovements as Record<'MA' | 'ST' | 'AV', number>,
    ...negativeImprovements as { PA: number | null; AG: number },
  };
}

const Player: PlayerResolvers = {
  id: parent => parent._id.toHexString(),
  team: async(parent, query, context) => {
    const team = await context.db.collection('teams').findOne<TeamDbObject>({ _id: parent.team });
    if (!team) throw new Error('Unable to find team for player');
    return team;
  },
  stats: async(parent, query, context) => {
    const { basePlayer } = await getPlayerInfo(parent, context.db);
    return calculateStats(basePlayer, parent);
  },
  skills: async(parent, query, context) => {
    const { basePlayer } = await getPlayerInfo(parent, context.db);
    const order = [...basePlayer.skills, ...parent.skills];
    const skillsQuery = [
      { $match: { _id: { $in: order } } },
      { $addFields: { __order: { $indexOfArray: [order, '$_id'] } } },
      { $sort: { __order: 1 } },
    ];
    const skills = await context.db.collection('skills')
      .aggregate<SkillDbObject>(skillsQuery)
      .toArray();
    return skills;
  },
  teamValue: async(parent, query, context) => getPlayerValue(parent, context.db),
  casualties: parent => ({ missNextGame: parent.injuries.missNextGame, niggles: parent.injuries.niggles }),
  starPlayerPoints: parent => calculateSPP(parent),
};

const Query: QueryResolvers = {
  player: async(parent, query, context) => {
    const player = await context.db.collection('players').findOne<PlayerDbObject>({ name: query.name });
    if (!player) return null;
    return player;
  },
};

const skillConflicts: Partial<Record<string, string[]>> = {
  'No Hands': ['Catch', 'Diving Catch', 'Safe Pair of Hands'],
  'Frenzy': ['Grab'],
  'Grab': ['Frenzy'],
  'Leap': ['Pogo Stick'],
  'Pogo Stick': ['Leap'],
  'Ball & Chain': ['Grab', 'Leap', 'Multiple Block', 'On the Ball', 'Shadowing'],
};

function throwIfPlayerCantTakeSKill(
  player: PlayerDbObject,
  basePlayer: RosterPlayerDbObject,
  category: SkillCategory,
): void {
  if (player.progression.length === 6)
    throw new Error('Player already has 6 advancements');
  if (![...basePlayer.primary, ...basePlayer.secondary].includes(category))
    throw new Error('Player can not get a skll from this category');
  const { current: currentSpp } = calculateSPP(player);
  const advancementType = basePlayer.primary.includes(category)
    ? ProgressionOption.RandomPrimary
    : ProgressionOption.RandomSecondary;
  const sppCost = advancementCosts[advancementType][player.progression.length];
  if (sppCost > currentSpp) throw new Error('Player does not have enough SPP');
}

function throwIfPlayerCantImproveCharacteristic(
  player: PlayerDbObject,
  basePlayer: RosterPlayerDbObject,
  characteristic: Exclude<CharacteristicImprovementPreference, CharacteristicImprovementPreference.Secondary>
): void {
  const maxStats = {
    MA: 9,
    ST: 8,
    PA: 6,
    AG: 6,
    AV: 11,
  };
  const minStats = {
    MA: 1,
    ST: 1,
    PA: 1,
    AG: 1,
    AV: 3,
  };
  if (player.progression.length === 6)
    throw new Error('Player already has 6 advancements');
  const progCount = player.progression.filter((p: string) => p === characteristic).length;
  if (progCount >= 2) throw new Error('Characteristic already improved twice');
  const improvedPlayer: PlayerDbObject = {
    ...player,
    improvements: {
      ...player.improvements,
      [characteristic]: player.improvements[characteristic] + 1,
    },
  };
  const stats = calculateStats(basePlayer, improvedPlayer);
  if (((stats[characteristic] ?? -Infinity) > maxStats[characteristic]) ||
      ((stats[characteristic] ?? Infinity) < minStats[characteristic]))
    throw new Error('Characteristic cannot be improved anymore');
}

const Mutation: MutationResolvers = {
  purchaseRandomSkill: async(parent, query, context) => {
    const playerId = new ObjectId(query.playerId);
    const { player, basePlayer } = await getPlayerInfo(playerId, context.db);
    throwIfPlayerCantTakeSKill(player, basePlayer, query.category);
    const playerSkills = await context.db.collection('skills')
      .find<SkillDbObject>({ _id: { $in: [...basePlayer.skills, ...player.skills] } })
      .toArray();
    const conflicts = playerSkills.flatMap(s => [s, ...skillConflicts[s.name] ?? []]);
    const skillsQuery = { category: query.category, purchasable: true, name: { $nin: conflicts } };
    const availableSkills = await context.db.collection('skills').find<SkillDbObject>(skillsQuery).toArray();
    const choice = availableSkills[Math.floor(Math.random() * availableSkills.length)];
    const advancementType = basePlayer.primary.includes(query.category)
      ? ProgressionOption.RandomPrimary
      : ProgressionOption.RandomSecondary;
    player.skills.push(choice._id);
    player.progression.push(advancementType);
    await context.db.collection('players').updateOne({ _id: player._id }, {
      $set: {
        skills: player.skills,
        progression: player.progression,
      },
    });
    return { success: true, skill: choice, player };
  },
  purchaseChosenSkill: async(parent, query, context) => {
    const skillId = new ObjectId(query.skillId);
    const playerId = new ObjectId(query.playerId);
    const skill = await context.db.collection('skills').findOne<SkillDbObject>({ _id: skillId });
    if (!skill) throw new Error('Skill ID not recognized');
    const { player, basePlayer } = await getPlayerInfo(playerId, context.db);
    throwIfPlayerCantTakeSKill(player, basePlayer, skill.category);
    const advancementType = basePlayer.primary.includes(skill.category)
      ? ProgressionOption.ChosenPrimary
      : ProgressionOption.ChosenSecondary;
    player.skills.push(skill._id);
    player.progression.push(advancementType);
    await context.db.collection('players').updateOne({ _id: player._id }, {
      $set: {
        skills: player.skills,
        progression: player.progression,
      },
    });
    return { success: true, skill, player };
  },
  purchaseCharacteristicImprovement: async(parent, query, context) => {
    // If `Secondary` isn't included in the preference list then you can cheat the roll
    // by asking only for the characteristic you want to improve.
    if (!query.preferences.includes(CharacteristicImprovementPreference.Secondary))
      throw new Error('Must include `Secondary` in preference list');
    const playerId = new ObjectId(query.playerId);
    const { player, basePlayer } = await getPlayerInfo(playerId, context.db);
    if (player.progression.length === 6)
      throw new Error('Player already has 6 advancements');
    const rollMap: Record<CharacteristicImprovementPreference, [number, number]> = {
      [CharacteristicImprovementPreference.Ma]: [1, 13],
      [CharacteristicImprovementPreference.Av]: [1, 13],
      [CharacteristicImprovementPreference.Pa]: [8, 14],
      [CharacteristicImprovementPreference.Ag]: [14, 15],
      [CharacteristicImprovementPreference.St]: [15, 15],
      [CharacteristicImprovementPreference.Secondary]: [1, 16],
    };
    const roll = Math.floor(Math.random() * 16) + 1;
    const choices = Object.keys(rollMap)
      .map(a => a as CharacteristicImprovementPreference)
      .filter(stat => roll === 16 || (roll >= rollMap[stat][0] && roll <= rollMap[stat][1]));
    const [prefIdx] = choices
      .map(c => query.preferences.indexOf(c))
      .filter(i => i !== -1)
      .sort((a, b) => a - b);
    if (!(prefIdx in query.preferences)) throw new Error('No preference found');
    const choice = query.preferences[prefIdx];
    // We have to check for a vaild skill even if that's not the choice rolled.
    // Otherwise, you could cheat by asking for a skill you can't take over and over again
    // until it finally rolls the improvement you wanted.
    const skillId = new ObjectId(query.secondarySkillChoice);
    const skill = await context.db.collection('skills').findOne<SkillDbObject>({ _id: skillId });
    if (!skill) throw new Error('Secondary skill not recognized');
    throwIfPlayerCantTakeSKill(player, basePlayer, skill.category);
    if (choice === CharacteristicImprovementPreference.Secondary) {
      player.skills.push(skill._id);
    } else {
      throwIfPlayerCantImproveCharacteristic(
        player,
        basePlayer,
        choice,
      );
      player.improvements[choice] += 1;
    }
    const progMap: Record<CharacteristicImprovementPreference, ProgressionOption> = {
      [CharacteristicImprovementPreference.Ag]: ProgressionOption.Ag,
      [CharacteristicImprovementPreference.Av]: ProgressionOption.Av,
      [CharacteristicImprovementPreference.Ma]: ProgressionOption.Ma,
      [CharacteristicImprovementPreference.Pa]: ProgressionOption.Pa,
      [CharacteristicImprovementPreference.St]: ProgressionOption.St,
      [CharacteristicImprovementPreference.Secondary]: ProgressionOption.CharacteristicSecondary,
    };
    player.progression.push(progMap[choice]);
    await context.db.collection('players').updateOne({ _id: playerId }, {
      $set: {
        skills: player.skills,
        improvements: player.improvements,
        progression: player.progression,
      },
    });
    return { success: true, player, characteristic: choice };
  },
};

export { Player, Query, Mutation };

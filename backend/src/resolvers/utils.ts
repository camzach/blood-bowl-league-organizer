import type { Collection, ObjectId } from 'mongodb';
import type { PlayerDbObject, RosterDbObject, SkillDbObject, TeamValue } from '../graphql.gen';

export function getPlayerValue(parent: PlayerDbObject, roster: RosterDbObject): TeamValue {
  const basePlayer = roster.players.find(p => p.position === parent.position);
  if (!basePlayer) throw new Error('Player position not recognized');
  const noHiringFee = (roster.specialRules.includes('Low Cost Linemen') && basePlayer.max >= 12);
  let cost = noHiringFee ? 0 : basePlayer.cost;
  for (const progression of parent.progression) {
    switch (progression) {
      case 'AV':
      case 'Random Primary':
        cost += 10000;
        break;
      case 'MA':
      case 'PA':
      case 'Chosen Primary':
      case 'Random Secondary':
        cost += 20000;
        break;
      case 'Chosen Secondary':
      case 'AG':
        cost += 40000;
        break;
      case 'ST':
        cost += 80000;
        break;
    }
    cost += 0 as never;
  }

  return { base: cost, current: parent.injuries.missNextGame ? 0 : cost };
}

export async function getModifiedSkills(
  skills: Array<{ id: ObjectId; modifier?: string }>,
  skillsCollection: Collection
): Promise<SkillDbObject[]> {
  const relevantSkills = await skillsCollection
    .find<SkillDbObject>({ _id: { $in: skills.map(s => s.id) } })
    .toArray();
  const result = skills.map(s => {
    const skill = relevantSkills.find(({ _id }) => _id.equals(s.id));
    if (!skill) throw new Error('Could not find a skill');

    if (s.modifier !== undefined) {
      skill.name = skill.name.replace('$$', s.modifier);
      skill.rules = skill.rules.replace('$$', s.modifier);
    }
    return skill;
  });
  return result;
}

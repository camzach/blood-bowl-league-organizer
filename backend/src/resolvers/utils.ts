import type { Collection, ObjectId } from 'mongodb';
import type { PlayerDbObject, RosterDbObject, SkillDbObject, TeamValue } from '../graphql.gen';

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

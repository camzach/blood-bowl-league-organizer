import type { skillRelation } from "~/db/schema";

type SkillRelation = typeof skillRelation.$inferSelect;

export type BlockReason =
  | { reason: "owned" }
  | { reason: "conflict"; conflictingSkill: string }
  | { reason: "requirement" };

export function getBlockedSkills(
  playerSkills: string[],
  skillRelations: SkillRelation[],
): Map<string, BlockReason> {
  const playerSkillNames = new Set(playerSkills);
  const blockedSkills = new Map<string, BlockReason>();

  // Rule 1: Add owned skills
  for (const skillName of playerSkillNames) {
    blockedSkills.set(skillName, { reason: "owned" });
  }

  const requirementStatus = new Map<string, boolean>();

  for (const relation of skillRelations) {
    if (relation.type === "conflicts") {
      if (playerSkillNames.has(relation.skillNameA)) {
        blockedSkills.set(relation.skillNameB, {
          reason: "conflict",
          conflictingSkill: relation.skillNameA,
        });
      }
      if (playerSkillNames.has(relation.skillNameB)) {
        blockedSkills.set(relation.skillNameA, {
          reason: "conflict",
          conflictingSkill: relation.skillNameB,
        });
      }
    } else if (relation.type === "requires") {
      const skillWithRequirement = relation.skillNameA;
      const prerequisite = relation.skillNameB;

      if (requirementStatus.get(skillWithRequirement)) {
        continue;
      }

      if (!requirementStatus.has(skillWithRequirement)) {
        requirementStatus.set(skillWithRequirement, false);
      }

      if (playerSkillNames.has(prerequisite)) {
        requirementStatus.set(skillWithRequirement, true);
      }
    }
  }

  for (const [skillName, status] of requirementStatus.entries()) {
    if (!status) {
      if (!blockedSkills.has(skillName)) {
        blockedSkills.set(skillName, { reason: "requirement" });
      }
    }
  }

  return blockedSkills;
}

import {
  Improvement,
  Player,
  Position,
  Roster,
  Skill,
  SkillCategory,
  SpecialRule,
} from "@prisma/client";

export function getPlayerStats(
  player: Player & { position: Position } & { improvements: Improvement[] }
) {
  const stats = player.improvements.reduce(
    (curr, next) => {
      switch (next.type) {
        case "AG":
          curr.AG -= 1;
          break;
        case "AV":
        case "MA":
        case "ST":
          curr[next.type] += 1;
          break;
        case "PA":
          if (curr.PA === null) curr.PA = 6;
          else curr.PA -= 1;
          break;
      }
      return curr;
    },
    {
      AG: player.position.AG + player.AGInjuries,
      ST: player.position.ST - player.STInjuries,
      AV: player.position.AV - player.AVInjuries,
      MA: player.position.MA - player.MAInjuries,
      PA: player.position.PA,
    }
  );

  return stats;
}

export function getPlayerSkills(
  player: Player & {
    position: Position & { skills: Skill[] };
    improvements: (Improvement & { skill: Skill | null })[];
  }
) {
  return [
    ...player.position.skills,
    ...player.improvements
      .flatMap(({ skill }) => (skill ? [skill] : []))
      .filter(Boolean),
  ];
}

export function getPlayerSppAndTv(player: {
  MVPs: number;
  touchdowns: number;
  casualties: number;
  completions: number;
  deflections: number;
  interceptions: number;
  improvements: (Improvement & { skill: Skill | null })[];
  position: {
    cost: number;
    primary: SkillCategory[];
    secondary: SkillCategory[];
    Roster: { specialRules: SpecialRule[] };
  };
}) {
  const tvCostTable = {
    randomPrimary: 10_000,
    chosenPrimary: 20_000,
    randomSecondary: 20_000,
    chosenSecondary: 40_000,
    AV: 10_000,
    MA: 20_000,
    PA: 20_000,
    AG: 40_000,
    ST: 80_000,
  };
  const sppCostTable = {
    randomPrimary: [3, 4, 6, 8, 10, 15],
    chosenPrimary: [6, 8, 12, 16, 20, 30],
    randomSecondary: [6, 8, 12, 16, 20, 30],
    chosenSecondary: [12, 14, 18, 22, 26, 40],
    characteristic: [18, 20, 24, 28, 32, 50],
  };
  return player.improvements.reduce(
    (prev, curr) => {
      let skillCategory = null;
      if (curr.skill) {
        if (player.position.primary.includes(curr.skill.category))
          skillCategory = "primary";
        if (player.position.secondary.includes(curr.skill.category))
          skillCategory = "secondary";
      }
      switch (curr.type) {
        case "ChosenSkill":
        case "FallbackSkill":
          if (skillCategory === "primary") {
            prev.starPlayerPoints -=
              curr.type === "FallbackSkill"
                ? sppCostTable.characteristic[curr.order]
                : sppCostTable.chosenPrimary[curr.order];
            prev.teamValue += tvCostTable.chosenPrimary;
          } else if (skillCategory === "secondary") {
            prev.starPlayerPoints -=
              curr.type === "FallbackSkill"
                ? sppCostTable.characteristic[curr.order]
                : sppCostTable.chosenSecondary[curr.order];
            prev.teamValue += tvCostTable.chosenSecondary;
          }
          break;
        case "RandomSkill":
          if (skillCategory === "primary") {
            prev.starPlayerPoints -= sppCostTable.randomPrimary[curr.order];
            prev.teamValue += tvCostTable.randomPrimary;
          } else if (skillCategory === "secondary") {
            prev.starPlayerPoints -= sppCostTable.randomSecondary[curr.order];
            prev.teamValue += tvCostTable.randomSecondary;
          }
          break;
        default:
          prev.starPlayerPoints -= sppCostTable.characteristic[curr.order];
          prev.teamValue += tvCostTable[curr.type];
      }
      return prev;
    },
    {
      starPlayerPoints:
        player.completions +
        player.interceptions +
        player.deflections +
        player.casualties * 2 +
        player.touchdowns * 3 +
        player.MVPs * 4,
      teamValue: player.position.Roster.specialRules.some(
        (rule) => rule.name === "Low Cost Linemen"
      )
        ? 0
        : player.position.cost,
    }
  );
}

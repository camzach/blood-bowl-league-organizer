import {
  improvement,
  player,
  position,
  roster,
  skill,
  skillCategory,
  specialRule,
} from "db/schema";

type Player = typeof player.$inferSelect;
type Position = typeof position.$inferSelect;
type Improvement = typeof improvement.$inferSelect;
type Skill = typeof skill.$inferSelect;
type SkillCategory = typeof skillCategory.$inferSelect;
type SpecialRule = typeof specialRule.$inferSelect;
type Roster = typeof roster;

export function getPlayerStats(
  player: Pick<
    Player,
    "agInjuries" | "stInjuries" | "avInjuries" | "maInjuries"
  > & { position: Pick<Position, "ag" | "av" | "ma" | "pa" | "st"> } & {
    improvements: Pick<Improvement, "type">[];
  }
) {
  const stats = player.improvements.reduce(
    (curr, next) => {
      switch (next.type) {
        case "ag":
          curr.ag -= 1;
          break;
        case "av":
        case "ma":
        case "st":
          curr[next.type] += 1;
          break;
        case "pa":
          if (curr.pa === null) curr.pa = 6;
          else curr.pa -= 1;
          break;
      }
      return curr;
    },
    {
      ag: player.position.ag + player.agInjuries,
      st: player.position.st - player.stInjuries,
      av: player.position.av - player.avInjuries,
      ma: player.position.ma - player.maInjuries,
      pa: player.position.pa,
    }
  );

  return stats;
}

export function getPlayerSkills(player: {
  position: { skills: Skill[] };
  improvements: { skill: Skill | null }[];
}) {
  return [
    ...player.position.skills,
    ...player.improvements
      .flatMap(({ skill }) => (skill ? [skill] : []))
      .filter(Boolean),
  ];
}

export function getPlayerSppAndTv(
  player: Pick<
    Player,
    | "mvps"
    | "touchdowns"
    | "completions"
    | "casualties"
    | "deflections"
    | "interceptions"
    | "mvps"
  > & {
    improvements: (Improvement & { skill: Skill | null })[];
    position: Pick<Position, "cost"> & {
      primary: string[];
      secondary: string[];
      roster: { specialRules: SpecialRule[] };
    };
  }
) {
  const tvCostTable = {
    random_primary: 10_000,
    chosen_primary: 20_000,
    random_secondary: 20_000,
    chosen_secondary: 40_000,
    av: 10_000,
    ma: 20_000,
    pa: 20_000,
    ag: 40_000,
    st: 80_000,
  };
  const sppCostTable = {
    random_primary: [3, 4, 6, 8, 10, 15],
    chosen_primary: [6, 8, 12, 16, 20, 30],
    random_secondary: [6, 8, 12, 16, 20, 30],
    chosen_secondary: [12, 14, 18, 22, 26, 40],
    characteristic: [18, 20, 24, 28, 32, 50],
  };
  return player.improvements.reduce(
    (prev, curr) => {
      let skillCategory = null;
      if (curr.skill) {
        if (player.position.primary.includes(curr.skill.categoryName))
          skillCategory = "primary";
        if (player.position.secondary.includes(curr.skill.categoryName))
          skillCategory = "secondary";
      }
      switch (curr.type) {
        case "chosen_skill":
        case "fallback_skill":
          if (skillCategory === "primary") {
            prev.starPlayerPoints -=
              curr.type === "fallback_skill"
                ? sppCostTable.characteristic[curr.order]
                : sppCostTable.chosen_primary[curr.order];
            prev.teamValue += tvCostTable.chosen_primary;
          } else if (skillCategory === "secondary") {
            prev.starPlayerPoints -=
              curr.type === "fallback_skill"
                ? sppCostTable.characteristic[curr.order]
                : sppCostTable.chosen_secondary[curr.order];
            prev.teamValue += tvCostTable.chosen_secondary;
          }
          break;
        case "random_skill":
          if (skillCategory === "primary") {
            prev.starPlayerPoints -= sppCostTable.random_primary[curr.order];
            prev.teamValue += tvCostTable.random_primary;
          } else if (skillCategory === "secondary") {
            prev.starPlayerPoints -= sppCostTable.random_secondary[curr.order];
            prev.teamValue += tvCostTable.random_secondary;
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
        player.mvps * 4,
      teamValue: player.position.roster.specialRules.some(
        (rule) => rule.name === "Low Cost Linemen"
      )
        ? 0
        : player.position.cost,
    }
  );
}

import {
  improvement,
  player,
  position,
  roster,
  skill,
  specialRuleToRoster,
} from "~/db/schema";

type Player = typeof player.$inferSelect;
type Position = typeof position.$inferSelect;
type Improvement = typeof improvement.$inferSelect;
type Skill = typeof skill.$inferSelect;
type Roster = typeof roster.$inferSelect;
type SpecialRuleToRoster = typeof specialRuleToRoster.$inferSelect;

export function getPlayerStats(
  player: Pick<
    Player,
    "agInjuries" | "stInjuries" | "avInjuries" | "maInjuries"
  > & { position: Pick<Position, "ag" | "av" | "ma" | "pa" | "st"> } & {
    improvements: Pick<Improvement, "type">[];
  },
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
    },
  );

  return stats;
}

export function getPlayerSkills(
  player: {
    position: { skillToPosition: Array<{ skill: Skill }> };
    improvements: { skill: Skill | null }[];
    isCaptain: boolean;
  },
  proSkill?: Skill,
) {
  const skills = [
    ...player.position.skillToPosition.map((e) => e.skill),
    ...player.improvements
      .flatMap(({ skill }) => (skill ? [skill] : []))
      .filter(Boolean),
  ];
  if (player.isCaptain && proSkill) {
    skills.push(proSkill);
  }
  return skills;
}

export function getPlayerSppAndTv(
  player: Pick<
    Player,
    | "mvps"
    | "touchdowns"
    | "completions"
    | "casualties"
    | "interceptions"
    | "safeLandings"
    | "mvps"
    | "otherSPP"
  > & {
    improvements: (Improvement & { skill: Skill | null })[];
    position: Pick<Position, "cost" | "primary" | "secondary"> & {
      rosterSlot: {
        roster: Pick<Roster, never> & {
          specialRuleToRoster: SpecialRuleToRoster[];
        };
      };
    };
  },
) {
  const tvCostTable = {
    primary: 20_000,
    secondary: 40_000,
    av: 10_000,
    ma: 20_000,
    pa: 20_000,
    ag: 40_000,
    st: 80_000,
  };
  const sppCostTable = {
    random_primary: [3, 4, 6, 8, 10, 15],
    chosen_primary: [6, 8, 12, 16, 20, 30],
    chosen_secondary: [12, 14, 18, 22, 26, 40],
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
        if (curr.skill.elite) {
          prev.teamValue += 10_000;
        }
      }
      switch (curr.type) {
        case "chosen_skill":
        case "fallback_skill":
          if (skillCategory === "primary") {
            prev.starPlayerPoints -=
              curr.type === "fallback_skill"
                ? sppCostTable.characteristic[curr.order]
                : sppCostTable.chosen_primary[curr.order];
            prev.teamValue += tvCostTable.primary;
          } else if (skillCategory === "secondary") {
            prev.starPlayerPoints -=
              curr.type === "fallback_skill"
                ? sppCostTable.characteristic[curr.order]
                : sppCostTable.chosen_secondary[curr.order];
            prev.teamValue += tvCostTable.secondary;
          }
          break;
        case "random_skill":
          if (skillCategory === "primary") {
            prev.starPlayerPoints -= sppCostTable.random_primary[curr.order];
            prev.teamValue += tvCostTable.primary;
          }
          break;
        case "automatic_skill":
          // Ignore these
          break;
        default:
          prev.starPlayerPoints -= sppCostTable.characteristic[curr.order];
          prev.teamValue += tvCostTable[curr.type];
      }
      return prev;
    },
    {
      starPlayerPoints: (() => {
        const hasBrawlinBrutes =
          player.position.rosterSlot.roster.specialRuleToRoster.some(
            (rule) => rule.specialRuleName === "Brawlin Brutes",
          );
        const touchdownSPP = hasBrawlinBrutes ? 2 : 3;
        const casualtySPP = hasBrawlinBrutes ? 3 : 2;
        return (
          player.completions +
          player.interceptions * 2 +
          player.safeLandings +
          player.casualties * casualtySPP +
          player.touchdowns * touchdownSPP +
          player.mvps * 4 +
          player.otherSPP
        );
      })(),
      teamValue: player.position.rosterSlot.roster.specialRuleToRoster.some(
        (rule) => rule.specialRuleName === "Low Cost Linemen",
      )
        ? 0
        : player.position.cost,
    },
  );
}

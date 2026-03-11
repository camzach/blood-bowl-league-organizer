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

const tvCostTable = {
  primary: 20_000,
  secondary: 40_000,
  av: 10_000,
  ma: 20_000,
  pa: 20_000,
  ag: 30_000,
  st: 60_000,
};
const sppCostTable = {
  random_primary: [3, 4, 6, 8, 10, 15],
  chosen_primary: [6, 8, 12, 16, 20, 30],
  chosen_secondary: [10, 12, 16, 20, 24, 34],
  characteristic: [14, 16, 20, 24, 28, 38],
};

export function getPlayerSppAndTv(
  player: Pick<
    Player,
    | "mvps"
    | "touchdowns"
    | "completions"
    | "casualties"
    | "interceptions"
    | "safeLandings"
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
  let teamValue = player.position.cost;
  if (
    player.position.rosterSlot.roster.specialRuleToRoster.some(
      (r) => r.specialRuleName === "Low Cost Linemen",
    )
  ) {
    teamValue = 0;
  }

  const [tdSpp, casSpp] =
    player.position.rosterSlot.roster.specialRuleToRoster.some(
      (rule) => rule.specialRuleName === "Brawlin' Brutes",
    )
      ? [2, 3]
      : [3, 2];

  let starPlayerPoints =
    player.mvps * 4 +
    player.touchdowns * tdSpp +
    player.completions * 1 +
    player.casualties * casSpp +
    player.interceptions * 2 +
    player.safeLandings * 1 +
    player.otherSPP * 1;

  for (const improvement of player.improvements
    .filter(({ order }) => order >= 0)
    .toSorted((a, b) => a.order - b.order)) {
    if (improvement.skill && improvement.skill.elite) {
      teamValue += 10000;
    }
    switch (improvement.type) {
      case "random_skill":
        starPlayerPoints -= sppCostTable["random_primary"][improvement.order];
        teamValue += tvCostTable["primary"];
        break;
      case "chosen_skill":
        {
          const skillCategory = player.position.primary.includes(
            improvement.skill!.category,
          )
            ? "primary"
            : "secondary";
          starPlayerPoints -=
            sppCostTable[`chosen_${skillCategory}`][improvement.order];
          teamValue += tvCostTable[skillCategory];
        }
        break;
      case "automatic_skill":
        break;
      default:
        starPlayerPoints -= sppCostTable["characteristic"][improvement.order];
        if (improvement.type === "fallback_skill") {
          const skillCategory = player.position.primary.includes(
            improvement.skill!.category,
          )
            ? "primary"
            : "secondary";
          teamValue += tvCostTable[skillCategory];
        } else {
          teamValue += tvCostTable[improvement.type];
        }
    }
  }

  return { starPlayerPoints, teamValue };
}

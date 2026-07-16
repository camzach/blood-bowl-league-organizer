import { eq } from "drizzle-orm";
import { db } from "~/utils/drizzle";
import { team as dbTeam, player, skill } from "~/db/schema";
import {
  getPlayerStats,
  getPlayerSppAndTv,
  getPlayerSkills,
} from "~/utils/get-computed-player-fields";
import { playerWithAdvancement } from "~/db/query-fragments/player.fragments";

export default async function fetchTeam(
  id: string,
  includeNonPlayers: boolean,
) {
  const proSkill = await db.query.skill.findFirst({
    where: eq(skill.name, "Pro"),
  });
  const fetchedTeam = await db.query.team.findFirst({
    where: eq(dbTeam.id, id),
    with: {
      roster: { with: { specialRuleToRoster: true } },
      players: {
        where: includeNonPlayers
          ? undefined
          : eq(player.membershipType, "player"),
        ...playerWithAdvancement,
      },
    },
  });

  if (!fetchedTeam) return null;

  return {
    ...fetchedTeam,
    players: fetchedTeam.players.map((p) => {
      const position = {
        ...p.position,
        skills: p.position.skillToPosition.map((stp) => stp.skill),
        roster: {
          ...p.position.rosterSlot.roster,
          specialRules: p.position.rosterSlot.roster.specialRuleToRoster.map(
            (sr) => sr.specialRule,
          ),
        },
      };
      return {
        ...p,
        ...getPlayerStats(p),
        ...getPlayerSppAndTv(p),
        position,
        skills: getPlayerSkills(p, proSkill),
        totalImprovements: p.improvements.length,
      };
    }),
  };
}

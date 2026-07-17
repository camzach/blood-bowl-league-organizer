import { db } from "~/utils/drizzle";
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
    where: { name: "Pro" },
  });
  const fetchedTeam = await db.query.team.findFirst({
    where: { id },
    with: {
      coaches: true,
      roster: { with: { specialRules: true } },
      players: {
        where: includeNonPlayers ? undefined : { membershipType: "player" },
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
        roster: {
          ...p.position.rosterSlot.roster,
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

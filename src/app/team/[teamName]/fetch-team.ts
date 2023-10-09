import { eq } from "drizzle-orm";
import { db } from "utils/drizzle";
import { team as dbTeam } from "db/schema";
import {
  getPlayerStats,
  getPlayerSppAndTv,
  getPlayerSkills,
} from "utils/get-computed-player-fields";

export default async function fetchTeam(name: string) {
  const fetchedTeam = await db.query.team.findFirst({
    where: eq(dbTeam.name, name),
    with: {
      roster: true,
      players: {
        with: {
          improvements: { with: { skill: true } },
          position: {
            with: {
              skillToPosition: { with: { skill: true } },
              rosterSlot: {
                with: {
                  roster: {
                    with: {
                      specialRuleToRoster: { with: { specialRule: true } },
                    },
                  },
                },
              },
            },
          },
        },
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
            (sr) => sr.specialRule
          ),
        },
      };
      return {
        ...p,
        ...getPlayerStats(p),
        ...getPlayerSppAndTv(p),
        position,
        skills: getPlayerSkills(p),
        totalImprovements: p.improvements.length,
      };
    }),
  };
}

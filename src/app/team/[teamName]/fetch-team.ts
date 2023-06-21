import { prisma } from "utils/prisma";
import {
  getPlayerSkills,
  getPlayerStats,
  getPlayerTotalImprovements,
} from "utils/get-computed-player-fields";

export async function fetchTeam(teamName: string) {
  const team = await prisma.team.findUnique({
    where: { name: teamName },
    include: {
      roster: { include: { positions: true } },
      players: {
        include: {
          learnedSkills: { include: { faq: true } },
          position: { include: { skills: true } },
        },
      },
      redrafts: {
        include: {
          learnedSkills: { include: { faq: true } },
          position: { include: { skills: true } },
        },
      },
      journeymen: {
        include: {
          learnedSkills: { include: { faq: true } },
          position: { include: { skills: true } },
        },
      },
      touchdownSong: { select: { name: true } },
    },
  });
  if (team === null) return null;
  return {
    ...team,
    players: team.players.map((p) => ({
      ...p,
      skills: getPlayerSkills(p),
      totalImprovements: getPlayerTotalImprovements(p),
      ...getPlayerStats(p),
    })),
    journeymen: team.journeymen.map((p) => ({
      ...p,
      skills: getPlayerSkills(p),
      totalImprovements: getPlayerTotalImprovements(p),
      ...getPlayerStats(p),
    })),
    redrafts: team.redrafts.map((p) => ({
      ...p,
      skills: getPlayerSkills(p),
      totalImprovements: getPlayerTotalImprovements(p),
      ...getPlayerStats(p),
    })),
  };
}

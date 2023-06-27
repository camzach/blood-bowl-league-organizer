import { prisma } from "utils/prisma";
import {
  getPlayerSkills,
  getPlayerSppAndTv,
  getPlayerStats,
} from "utils/get-computed-player-fields";
import { Prisma } from "@prisma/client";

const playerSelect = {
  include: {
    improvements: { include: { skill: true } },
    position: {
      include: {
        skills: true,
        Roster: { select: { specialRules: true } },
      },
    },
  },
} satisfies Prisma.PlayerArgs;

export async function fetchTeam(teamName: string) {
  const team = await prisma.team.findUnique({
    where: { name: teamName },
    include: {
      roster: { include: { positions: true } },
      players: playerSelect,
      redrafts: playerSelect,
      journeymen: playerSelect,
      touchdownSong: { select: { name: true } },
    },
  });
  if (team === null) return null;
  return {
    ...team,
    players: team.players.map((p) => ({
      ...p,
      skills: getPlayerSkills(p),
      totalImprovements: p.improvements.length,
      ...getPlayerStats(p),
      ...getPlayerSppAndTv(p),
    })),
    journeymen: team.journeymen.map((p) => ({
      ...p,
      skills: getPlayerSkills(p),
      totalImprovements: p.improvements.length,
      ...getPlayerStats(p),
      ...getPlayerSppAndTv(p),
    })),
    redrafts: team.redrafts.map((p) => ({
      ...p,
      skills: getPlayerSkills(p),
      totalImprovements: p.improvements.length,
      ...getPlayerStats(p),
      ...getPlayerSppAndTv(p),
    })),
  };
}

import type { Position, Prisma, Skill } from '@prisma/client';

export function newPlayer(
  position: Position & { skills: Skill[] },
  name?: string
): Prisma.PlayerCreateInput {
  return {
    MA: position.MA,
    AG: position.AG,
    PA: position.PA,
    ST: position.ST,
    AV: position.AV,
    teamValue: position.cost,
    skills: { connect: position.skills.map(s => ({ name: s.name })) },
    name,
    position: { connect: { id: position.id } },
  };
}

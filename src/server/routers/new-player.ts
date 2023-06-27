import type { Position, Prisma, Skill } from "@prisma/client";

export function newPlayer(
  position: Position & { skills: Skill[] },
  number: number,
  playerName?: string
): Prisma.PlayerCreateInput {
  return {
    number,
    name: playerName,
    position: { connect: { id: position.id } },
  };
}

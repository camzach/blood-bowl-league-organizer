import { TeamState } from '@prisma/client';
import { z } from 'zod';
import { prisma } from './prisma-singleton';
import { publicProcedure, router } from './trpc';

export const playerRouter = router({
  fire: publicProcedure
    .input(z.string().transform(async id => prisma.player.findFirstOrThrow({
      where: { id },
      select: { playerTeam: { select: { state: true, name: true } }, position: { select: { cost: true } }, id: true },
    })))
    .mutation(async({ input }) => {
      if (input.playerTeam === null)
        throw new Error('Player is not on any team');
      if (input.playerTeam.state === TeamState.Draft) {
        return prisma.team.update({
          where: { name: input.playerTeam.name },
          data: {
            players: { delete: { id: input.id } },
            treasury: { increment: input.position.cost },
          },
        });
      }
      if (input.playerTeam.state === TeamState.PostGame) {
        return prisma.player.update({
          where: { id: input.id },
          data: { playerTeam: { disconnect: true } },
        });
      }
      throw new Error('Team not in Draft or PostGame state');
    }),
});

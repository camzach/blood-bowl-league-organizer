import { publicProcedure, router } from 'server/trpc';
import { z } from 'zod';
import { hash } from 'bcryptjs';

export const coachRouter = router({
  updatePassword: publicProcedure
    .input(z.object({ name: z.string(), password: z.string() }))
    .mutation(async({ input, ctx }) => {
      if (ctx.session?.user.id !== input.name)
        throw new Error('Not authorized');
      return hash(input.password, 10)
        .then(newHash => ctx.prisma.coach.update({
          where: { name: input.name },
          data: { passwordHash: newHash, needsNewPassword: false },
        }));
    }),
});

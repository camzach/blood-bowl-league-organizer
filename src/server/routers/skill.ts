import { publicProcedure, router } from '../trpc';

export const skillRouter = router({
  list: publicProcedure
    .query(({ ctx }) => ctx.prisma.skill.findMany({ })),
});

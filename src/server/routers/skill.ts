import { publicProcedure, router } from '../trpc';

export const skillRouter = router({
  list: publicProcedure
    .query(async({ ctx }) => ctx.prisma.skill.findMany({ })),
});

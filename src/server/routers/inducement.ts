import { publicProcedure, router } from "server/trpc";
import { z } from "zod";

export const inducementRouter = router({
  list: publicProcedure
    .input(
      z
        .object({ team: z.string() })
        .or(z.object({ specialRules: z.array(z.string()) }))
        .or(z.undefined())
    )
    .query(async ({ input, ctx }) => {
      const specialRules = await (async (): Promise<string[] | null> => {
        if (typeof input === "undefined") {
          return null;
        } else if ("team" in input) {
          const team = await ctx.prisma.team.findUniqueOrThrow({
            where: { name: input.team },
            select: {
              roster: { select: { specialRules: { select: { name: true } } } },
            },
          });
          return team.roster.specialRules.map((rule) => rule.name);
        }
        return input.specialRules;
      })();
      const inducements = await ctx.prisma.inducement.findMany({
        where: specialRules
          ? {
              OR: [
                { price: { not: null } },
                { specialPriceRuleName: { in: specialRules } },
                {
                  options: {
                    some: {
                      OR: [
                        { price: { not: null } },
                        { specialPriceRuleName: { in: specialRules } },
                      ],
                    },
                  },
                },
              ],
            }
          : undefined,
        include: {
          options: specialRules
            ? {
                where: {
                  OR: [
                    { price: { not: null } },
                    { specialPriceRuleName: { in: specialRules } },
                  ],
                },
              }
            : true,
        },
      });
      if (specialRules) {
        inducements.forEach((i) => {
          if (i.specialPriceRuleName === null) return;
          i.price = specialRules.includes(i.specialPriceRuleName)
            ? i.specialPrice
            : i.price;
          i.options.forEach((o) => {
            if (o.specialPriceRuleName === null) return;
            o.price = specialRules.includes(o.specialPriceRuleName)
              ? o.specialPrice
              : o.price;
          });
        });
      }
      const stars = await ctx.prisma.starPlayer.findMany(
        specialRules
          ? { where: { playsFor: { some: { name: { in: specialRules } } } } }
          : undefined
      );
      return { inducements, stars };
    }),
});

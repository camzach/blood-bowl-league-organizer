import { PrismaClient } from "@prisma/client/edge";
import * as trpcNext from "@trpc/server/adapters/next";
import { getServerSession } from "next-auth";
import { appRouter } from "server/routers";
import { authOptions } from "../auth/[...nextauth]";

export default trpcNext.createNextApiHandler({
  router: appRouter,
  createContext: async (ctx) => {
    const { req, res } = ctx;
    const session = await getServerSession(req, res, authOptions);
    return {
      prisma: new PrismaClient({ log: ["warn", "error"] }),
      session,
    };
  },
  responseMeta() {
    return { headers: { "cache-control": "no-cache" } };
  },
});

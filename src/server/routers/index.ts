import { router } from "server/trpc";
import { inducementRouter } from "./inducement";
import { scheduleRouter } from "./schedule-generator";
import { teamRouter } from "./team";

export const appRouter = router({
  team: teamRouter,
  schedule: scheduleRouter,
  inducements: inducementRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;

import { router } from "server/trpc";
import { inducementRouter } from "./inducement";
import { scheduleRouter } from "./schedule-generator";

export const appRouter = router({
  schedule: scheduleRouter,
  inducements: inducementRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;

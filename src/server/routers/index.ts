import { router } from "server/trpc";
import { gameRouter } from "./game";
import { inducementRouter } from "./inducement";
import { scheduleRouter } from "./schedule-generator";
import { teamRouter } from "./team";
import { skillRouter } from "./skill";
import { coachRouter } from "./coach";

export const appRouter = router({
  team: teamRouter,
  game: gameRouter,
  schedule: scheduleRouter,
  inducements: inducementRouter,
  skill: skillRouter,
  coach: coachRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;

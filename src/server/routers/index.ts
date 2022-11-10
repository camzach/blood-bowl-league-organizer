import { router } from 'server/trpc';
import { gameRouter } from './game';
import { inducementRouter } from './inducement';
import { playerRouter } from './player';
import { scheduleRouter } from './schedule-generator';
import { teamRouter } from './team';

export const appRouter = router({
  team: teamRouter,
  game: gameRouter,
  schedule: scheduleRouter,
  player: playerRouter,
  inducements: inducementRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;

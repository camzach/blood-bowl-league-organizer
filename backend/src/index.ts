import express from 'express';
import { router } from './trpc';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import cors from 'cors';
import { teamRouter } from './team';
import { scheduleRouter } from './schedule-generator';
import { gameRouter } from './game';
import { playerRouter } from './player';

const app = express();
const port = process.env.PORT ?? 8080;

const appRouter = router({
  team: teamRouter,
  schedule: scheduleRouter,
  game: gameRouter,
  player: playerRouter,
});

app.use(cors());
app.use(createExpressMiddleware({ router: appRouter }));

// TODO
// Retire Player

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

export type AppRouter = typeof appRouter;

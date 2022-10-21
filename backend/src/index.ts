import express from 'express';
import { router } from './trpc';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { teamRouter } from './team';
import { scheduleRouter } from './schedule-generator';
import { gameRouter } from './game';

const app = express();
const port = process.env.PORT ?? 8080;

const appRouter = router({
  team: teamRouter,
  schedule: scheduleRouter,
  game: gameRouter,
});

app.use(createExpressMiddleware({ router: appRouter }));

// TODO
// Update Player
// Fire Player
// Retire Player

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

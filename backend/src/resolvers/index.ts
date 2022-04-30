import type { Resolvers } from '../graphql.gen';
import { Player, PlayerQueries } from './player';
import { Team, TeamQueries } from './team';
import { Game, GameQueries } from './game';
import { ScheduleQueries, ScheduledGame } from './schedule';

type Falsy = '' | 0 | false | null | undefined;
export const isTruthy = <T>(x: Falsy | T): x is T => Boolean(x);

export const resolvers: Resolvers = {
  Player,
  Team,
  Game,
  ScheduledGame,
  Query: {
    ...PlayerQueries,
    ...TeamQueries,
    ...GameQueries,
    ...ScheduleQueries,
  },
};

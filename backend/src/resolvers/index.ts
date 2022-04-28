import type { Resolvers } from '../graphql.gen';
import { Player, PlayerQueries } from './player';
import { Team, TeamQueries } from './team';
import { Game, GameQueries } from './game';

type Falsy = '' | 0 | false | null | undefined;
export const isTruthy = <T>(x: Falsy | T): x is T => Boolean(x);

export const resolvers: Resolvers = {
  Player,
  Team,
  Game,
  Query: {
    ...PlayerQueries,
    ...TeamQueries,
    ...GameQueries,
  },
};

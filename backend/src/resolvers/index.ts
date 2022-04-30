import type { Resolvers } from '../graphql.gen';
import { merge } from 'lodash';
import * as Player from './player';
import * as Team from './team';
import * as Game from './game';
import * as Schedule from './schedule';
import * as Inducement from './inducement';

export const resolvers = merge(
  {},
  Player,
  Team,
  Game,
  Schedule,
  Inducement,
) as Resolvers;

import type { Resolvers } from '../graphql.gen';
import { merge } from 'lodash';
import * as Player from './player';
import * as Team from './team';
import * as Game from './game';
import * as Schedule from './schedule';
import * as Inducement from './inducement';
import * as Roster from './roster';

export const resolvers = merge(
  {},
  Player,
  Team,
  Game,
  Schedule,
  Inducement,
  Roster,
) as Resolvers;

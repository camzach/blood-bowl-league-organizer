import type { Resolvers } from '../graphql.gen';
import { merge } from 'lodash';
import * as Player from './player';
import * as Team from './team';
import * as Game from './game';
import * as Schedule from './schedule';

export const resolvers: Resolvers = merge({}, Player, Team, Game, Schedule);

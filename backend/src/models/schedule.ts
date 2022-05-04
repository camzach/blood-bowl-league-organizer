import type { Game } from '../graphql.gen';

export type ScheduledGameModel = {
  homeId: string;
  awayId: string;
};

export type ScheduleSlotModel =
  | Game
  | {
    homeId: string;
    awayId: string;
  };

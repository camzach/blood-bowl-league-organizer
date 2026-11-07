import { customAlphabet } from "nanoid";
import { testDb } from "./db";
import {
  team,
  player,
  gameDetails,
  game,
  coachToTeam,
  roundRobinGame,
  season,
} from "~/db/schema";
import type { teamStates, gameStates } from "~/db/schema";

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  15,
);

export const DEFAULT_ROSTER = "Amazon";
export const DEFAULT_POSITION_ID = "FETXHaNhShGJu7F";

type TeamState = (typeof teamStates)[number];
type GameState = (typeof gameStates)[number];

export async function seedTeam(
  leagueId: string,
  coachId: string,
  opts: {
    state?: TeamState;
    name?: string;
    playerCount?: number;
    treasury?: number;
    /** Give the first player this many otherSPP (useful for testing the improving phase). */
    firstPlayerSPP?: number;
  } = {},
) {
  const {
    state = "ready",
    name = `Team-${nanoid()}`,
    playerCount = 11,
    treasury = 1_000_000,
    firstPlayerSPP,
  } = opts;

  const teamId = nanoid();

  await testDb.insert(team).values({
    id: teamId,
    name,
    leagueId,
    rosterName: DEFAULT_ROSTER,
    state,
    treasury,
  });

  await testDb.insert(coachToTeam).values({ coachId, teamId });

  if (playerCount > 0) {
    await testDb.insert(player).values(
      Array.from({ length: playerCount }, (_, i) => ({
        id: nanoid(),
        number: i + 1,
        positionId: DEFAULT_POSITION_ID,
        teamId,
        membershipType: "player" as const,
        otherSPP: i === 0 && firstPlayerSPP ? firstPlayerSPP : 0,
      })),
    );
  }

  return { teamId, name };
}

export async function seedGame(
  homeTeamId: string,
  awayTeamId: string,
  opts: {
    state?: GameState;
    seasonId?: string;
    round?: number;
  } = {},
) {
  const { state = "scheduled", seasonId, round = 1 } = opts;

  const homeDetailsId = nanoid();
  const awayDetailsId = nanoid();
  const gameId = nanoid();

  await testDb.insert(gameDetails).values([
    { id: homeDetailsId, teamId: homeTeamId },
    { id: awayDetailsId, teamId: awayTeamId },
  ]);

  await testDb.insert(game).values({
    id: gameId,
    state,
    homeDetailsId,
    awayDetailsId,
  });

  if (seasonId) {
    await testDb.insert(roundRobinGame).values({ gameId, seasonId, round });
  }

  return { gameId, homeDetailsId, awayDetailsId };
}

export async function seedSeason(
  leagueId: string,
  opts: { name?: string; isActive?: boolean } = {},
) {
  const { name = `Season-${nanoid()}`, isActive = false } = opts;
  const seasonId = nanoid();

  await testDb.insert(season).values({
    id: seasonId,
    name,
    leagueId,
    isActive,
  });

  return { seasonId };
}

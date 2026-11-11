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
  pendingRandomSkill,
  pendingRandomStat,
} from "~/db/schema";
import type { teamStates, gameStates, SkillCategory } from "~/db/schema";

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
    firstPlayerSPP?: number;
    rosterName?: string;
    positionIds?: string[];
  } = {},
) {
  const {
    state = "ready",
    name = `Team-${nanoid()}`,
    playerCount = 11,
    treasury = 1_000_000,
    firstPlayerSPP,
    rosterName = DEFAULT_ROSTER,
    positionIds = Array.from(
      { length: playerCount },
      () => DEFAULT_POSITION_ID,
    ),
  } = opts;

  const teamId = nanoid();

  await testDb.insert(team).values({
    id: teamId,
    name,
    leagueId,
    rosterName,
    state,
    treasury,
  });

  await testDb.insert(coachToTeam).values({ coachId, teamId });

  const playerIds = positionIds.map(() => nanoid());

  if (positionIds.length > 0) {
    await testDb.insert(player).values(
      positionIds.map((positionId, i) => ({
        id: playerIds[i],
        number: i + 1,
        positionId,
        teamId,
        membershipType: "player" as const,
        otherSPP: i === 0 && firstPlayerSPP ? firstPlayerSPP : 0,
      })),
    );
  }

  return { teamId, name, playerIds };
}

export async function seedPendingRandomStat(playerId: string, roll: number) {
  await testDb.insert(pendingRandomStat).values({ playerId, roll });
}

export async function seedPendingRandomSkill(
  playerId: string,
  category: SkillCategory,
  skillName1: string,
  skillName2: string,
) {
  await testDb
    .insert(pendingRandomSkill)
    .values({ playerId, category, skillName1, skillName2 });
}

export async function seedGame(
  leagueId: string,
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
    { id: homeDetailsId, leagueId, teamId: homeTeamId },
    { id: awayDetailsId, leagueId, teamId: awayTeamId },
  ]);

  await testDb.insert(game).values({
    id: gameId,
    leagueId,
    state,
    homeDetailsId,
    awayDetailsId,
  });

  if (seasonId) {
    await testDb
      .insert(roundRobinGame)
      .values({ gameId, leagueId, seasonId, round });
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

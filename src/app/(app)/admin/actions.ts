"use server";

import {
  bracketGame,
  game,
  gameDetails,
  gameDetailsToInducement,
  gameDetailsToStarPlayer,
  roundRobinGame,
  season,
} from "db/schema";
import { and, eq, inArray, InferInsertModel, sql } from "drizzle-orm";
import nanoid from "utils/nanoid";
import { db } from "utils/drizzle";
import { action } from "utils/safe-action";
import { generateSchedule } from "utils/schedule-generator";
import { z } from "zod";
import { getLeagueTable } from "utils/get-league-table";
import { auth } from "auth";
import { headers } from "next/headers";

export const scheduleAction = action.schema(z.any()).action(async () => {
  const apiSession = await auth.api.getSession({ headers: headers() });
  if (!apiSession) {
    throw new Error("Not authenticated");
  }
  const { user, session } = apiSession;

  if (!session.activeOrganizationId || user.role !== "admin") {
    throw new Error("Not authenticated");
  }

  await db.transaction(async (tx) => {
    const activeSeason = await tx.query.season.findFirst({
      where: and(
        eq(season.leagueName, session.activeOrganizationId ?? ""),
        eq(season.isActive, true),
      ),
      with: {
        roundRobinGames: {
          columns: {},
          extras: { _: sql`'_'`.as("_") },
        },
      },
    });
    if (!activeSeason) throw new Error("No active season");
    if (activeSeason.roundRobinGames.length > 0)
      throw new Error("Schedule already generated");

    const teams = (await tx.query.team.findMany({ columns: { id: true } })).map(
      (t) => t.id,
    );

    const rounds = generateSchedule(teams).map((round, i) => ({
      number: i + 1,
      pairs: round.map((pair) => ({
        home: { teamId: pair[0], id: nanoid() },
        away: { teamId: pair[1], id: nanoid() },
      })),
    }));

    for (const round of rounds) {
      for (const roundGame of round.pairs) {
        await tx.insert(gameDetails).values([roundGame.home, roundGame.away]);
        const gameId = nanoid();
        await tx.insert(game).values([
          {
            homeDetailsId: roundGame.home.id,
            awayDetailsId: roundGame.away.id,
            id: gameId,
          },
        ]);
        await tx.insert(roundRobinGame).values([
          {
            gameId,
            round: round.number,
            seasonId: activeSeason.id,
          },
        ]);
      }
    }
  });
});

export const clearAction = action.schema(z.any()).action(async () => {
  const apiSession = await auth.api.getSession({ headers: headers() });
  if (!apiSession) {
    throw new Error("Not authenticated");
  }
  const { user, session } = apiSession;

  if (!session.activeOrganizationId || user.role !== "admin") {
    throw new Error("Not authenticated");
  }

  await db.transaction(async (tx) => {
    const activeSeason = await tx.query.season.findFirst({
      where: and(
        eq(season.leagueName, session.activeOrganizationId ?? ""),
        eq(season.isActive, true),
      ),
    });
    if (!activeSeason) throw new Error("No active season");
    const gameIds = (
      await tx
        .delete(roundRobinGame)
        .where(eq(roundRobinGame.seasonId, activeSeason.id))
        .returning({ gameId: roundRobinGame.gameId })
    ).map((round) => round.gameId);

    if (gameIds.length === 0) return;
    const gameDetailsIds = (
      await tx.delete(game).where(inArray(game.id, gameIds)).returning({
        homeDetails: game.homeDetailsId,
        awayDetails: game.awayDetailsId,
      })
    )
      .flatMap((game) => [game.homeDetails, game.awayDetails])
      .filter((x): x is string => !!x);
    await Promise.all([
      tx
        .delete(gameDetailsToInducement)
        .where(inArray(gameDetailsToInducement.gameDetailsId, gameDetailsIds)),
      tx
        .delete(gameDetailsToStarPlayer)
        .where(inArray(gameDetailsToStarPlayer.gameDetailsId, gameDetailsIds)),
    ]);
    await tx.delete(gameDetails).where(inArray(gameDetails.id, gameDetailsIds));
  });
});
export const rescheduleGames = action
  .schema(z.array(z.object({ id: z.string(), time: z.string().datetime() })))
  .action(async ({ parsedInput: games }) => {
    const apiSession = await auth.api.getSession({ headers: headers() });
    if (!apiSession) {
      throw new Error("Not authenticated");
    }
    const { user, session } = apiSession;

    if (!session.activeOrganizationId || user.role !== "admin") {
      throw new Error("Not authenticated");
    }

    await db.transaction(async (tx) => {
      const activeSeason = await tx.query.season.findFirst({
        where: and(
          eq(season.leagueName, session.activeOrganizationId ?? ""),
          eq(season.isActive, true),
        ),
        with: {
          roundRobinGames: true,
        },
      });

      await Promise.all(
        games.map(async (g) => {
          if (!activeSeason?.roundRobinGames.some((gg) => gg.gameId === g.id)) {
            throw new Error("Game not found");
          }
          return tx
            .update(game)
            .set({ scheduledTime: new Date(g.time) })
            .where(eq(game.id, g.id));
        }),
      );

      return "Success";
    });
  });
export const seedBracket = action.schema(z.any()).action(async () => {
  const apiSession = await auth.api.getSession({ headers: headers() });
  if (!apiSession) {
    throw new Error("Not authenticated");
  }
  const { user, session } = apiSession;

  if (!session.activeOrganizationId || user.role !== "admin") {
    throw new Error("Not authenticated");
  }
  return await db.transaction(async (tx) => {
    const activeSeason = await tx.query.season.findFirst({
      where: and(
        eq(season.leagueName, session.activeOrganizationId ?? ""),
        eq(season.isActive, true),
      ),
    });
    if (!activeSeason) {
      throw new Error("No active season");
    }

    {
      const bracketGames = await tx.query.bracketGame.findMany({
        where: eq(bracketGame.seasonId, activeSeason.id),
      });
      const gameIds = bracketGames.map((g) => g.gameId).filter((id) => !!id);
      const games = await tx.query.game.findMany({
        where: inArray(game.id, gameIds),
      });
      const gameDetailsIds = games
        .flatMap((g) => [g.homeDetailsId, g.awayDetailsId])
        .filter((id): id is string => !!id);

      console.log(`Deleting ${gameIds.length} bracket games`);
      await tx.delete(bracketGame).where(inArray(bracketGame.gameId, gameIds));
      console.log(`Deleting ${gameIds.length} games`);
      await tx.delete(game).where(inArray(game.id, gameIds));
      console.log(`Deleting ${gameDetailsIds.length} game details`);
      await tx
        .delete(gameDetails)
        .where(inArray(gameDetails.id, gameDetailsIds));
    }
    const leagueTable = await getLeagueTable(tx);
    const TOP_CUT = 8;
    const teams = Object.keys(leagueTable)
      .sort((a, b) => leagueTable[b].points - leagueTable[a].points)
      .slice(0, TOP_CUT);

    const detailsInserts: Array<InferInsertModel<typeof gameDetails>> = [];
    const gameInserts: Array<InferInsertModel<typeof game>> = [];
    const bracketGameInserts: Array<InferInsertModel<typeof bracketGame>> = [];

    type Game = {
      homeGame?: Game;
      homeSeed: number;
      awayGame?: Game;
      awaySeed: number;
      round: number;
    };
    function fillBracketRecursively(
      game: Game,
      depth: number,
      max_depth: number,
    ) {
      if (depth > max_depth) return;
      const homePrevOpponent = Math.pow(2, depth) - game.homeSeed + 1;
      if (homePrevOpponent <= teams.length) {
        game.homeGame = {
          homeSeed: game.homeSeed,
          awaySeed: homePrevOpponent,
          round: depth,
        };
        fillBracketRecursively(game.homeGame, depth + 1, max_depth);
      }
      const awayPrevOpponent = Math.pow(2, depth) - game.awaySeed + 1;
      if (awayPrevOpponent <= teams.length) {
        game.awayGame = {
          homeSeed: game.awaySeed,
          awaySeed: awayPrevOpponent,
          round: depth,
        };
        fillBracketRecursively(game.awayGame, depth + 1, max_depth);
      }
    }

    const nRounds = Math.ceil(Math.log2(teams.length));
    const finals: Game = { homeSeed: 1, awaySeed: 2, round: 1 };
    fillBracketRecursively(finals, 2, nRounds);

    const queue = [finals];
    while (queue.length > 0) {
      const current = queue.pop()!;
      let homeDetailsId, awayDetailsId;
      if (current.homeGame) {
        queue.push(current.homeGame);
      } else {
        homeDetailsId = nanoid();
        detailsInserts.push({
          id: homeDetailsId,
          teamId: teams[current.homeSeed - 1],
        });
      }
      if (current.awayGame) {
        queue.push(current.awayGame);
      } else {
        awayDetailsId = nanoid();
        detailsInserts.push({
          id: awayDetailsId,
          teamId: teams[current.awaySeed - 1],
        });
      }

      const gameId = nanoid();
      gameInserts.push({
        id: gameId,
        homeDetailsId,
        awayDetailsId,
      });
      bracketGameInserts.push({
        gameId,
        seasonId: activeSeason.id,
        round: current.round,
        seed: current.homeSeed,
      });
    }

    console.log(JSON.stringify(bracketGameInserts, null, 2));
    console.log(JSON.stringify(finals, null, 2));

    await tx.insert(gameDetails).values(detailsInserts);
    await tx.insert(game).values(gameInserts);
    await tx.insert(bracketGame).values(bracketGameInserts);
    return "Success!";
  });
});

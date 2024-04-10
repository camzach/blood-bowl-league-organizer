"use server";

import {
  game,
  gameDetails,
  gameDetailsToInducement,
  gameDetailsToStarPlayer,
  roundRobinGame,
  season,
} from "db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import nanoid from "utils/nanoid";
import { db } from "utils/drizzle";
import { action } from "utils/safe-action";
import { generateSchedule } from "utils/schedule-generator";
import { z } from "zod";
import { currentUser } from "@clerk/nextjs";

export const scheduleAction = action(z.any(), async () => {
  const user = await currentUser();
  if (!user?.publicMetadata.league || !user.publicMetadata.isAdmin) {
    throw new Error("Not authenticated");
  }

  await db.transaction(async (tx) => {
    const activeSeason = await tx.query.season.findFirst({
      where: and(
        eq(season.leagueName, user.publicMetadata.league as string),
        eq(season.isActive, true),
      ),
      with: {
        roundRobinGames: {
          columns: {},
          extras: { _: sql<never>`'_'`.as("_") },
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

export const clearAction = action(z.any(), async () => {
  const user = await currentUser();
  if (!user?.publicMetadata.league || !user.publicMetadata.isAdmin) {
    throw new Error("Not authenticated");
  }

  await db.transaction(async (tx) => {
    const activeSeason = await tx.query.season.findFirst({
      where: and(
        eq(season.leagueName, user.publicMetadata.league as string),
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
    ).flatMap((game) => [game.homeDetails, game.awayDetails]);
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
export const rescheduleGames = action(
  z.array(z.object({ id: z.string(), time: z.string().datetime() })),
  async (games) => {
    const user = await currentUser();
    if (!user?.publicMetadata.league || !user.publicMetadata.isAdmin) {
      throw new Error("Not authenticated");
    }
    await db.transaction(async (tx) => {
      const activeSeason = await tx.query.season.findFirst({
        where: and(
          eq(season.leagueName, user.publicMetadata.league as string),
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
  },
);

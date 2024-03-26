"use server";

import {
  game,
  gameDetails,
  gameDetailsToInducement,
  gameDetailsToStarPlayer,
  roundRobinGame,
  season,
} from "db/schema";
import { count, eq, inArray } from "drizzle-orm";
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
    const games = await tx.select({ count: count() }).from(game);
    if (games[0].count > 0) throw new Error("Schedule already generated");

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
    await tx
      .insert(season)
      .values([
        { name: "2024", leagueName: user.publicMetadata.league as string },
      ])
      .onConflictDoNothing();
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
            seasonName: "2024",
          },
        ]);
      }
    }
  });
});

export const clearAction = action(z.any(), async () => {
  "use server";
  const seasonName = process.env.ACTIVE_SEASON;
  if (!seasonName) throw new Error("No active season");

  return db.transaction(async (tx) => {
    const gameIds = (
      await tx
        .delete(roundRobinGame)
        .where(eq(roundRobinGame.seasonName, seasonName))
        .returning({ gameId: roundRobinGame.gameId })
    ).map((round) => round.gameId);
    await tx.delete(season).where(eq(season.name, seasonName));
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

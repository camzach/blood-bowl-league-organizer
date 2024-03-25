"use server";

import { game, gameDetails, roundRobinGame, season } from "db/schema";
import { count } from "drizzle-orm";
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

    const teams = (
      await tx.query.team.findMany({ columns: { name: true } })
    ).map((t) => t.name);

    const rounds = generateSchedule(teams).map((round, i) => ({
      number: i + 1,
      pairs: round.map((pair) => ({
        home: { teamName: pair[0], id: nanoid() },
        away: { teamName: pair[1], id: nanoid() },
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

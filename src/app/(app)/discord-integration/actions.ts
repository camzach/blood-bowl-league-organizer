"use server";

import { action, requireRole } from "utils/safe-action";
import { z } from "zod";
import { db } from "utils/drizzle";
import { league } from "db/schema";
import { eq } from "drizzle-orm";

export const updateDiscordGuildId = action
  .inputSchema(
    z.object({
      guildId: z.string(),
      leagueId: z.string(),
    }),
  )
  .use(async ({ next }) => {
    return next({ ctx: { authParams: { role: "admin" } } });
  })
  .use(requireRole)
  .action(async ({ parsedInput: { guildId, leagueId } }) => {
    const oldLeague = await db.query.league.findFirst({
      where: eq(league.id, leagueId),
    });

    if (!oldLeague) {
      throw new Error("League not found.");
    }

    await db
      .update(league)
      .set({ discordGuildId: guildId })
      .where(eq(league.id, leagueId));

    return { success: true };
  });

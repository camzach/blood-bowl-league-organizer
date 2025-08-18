"use server";

import { coachToTeam, optionalSpecialRuleToRoster, team } from "db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "utils/drizzle";
import nanoid from "utils/nanoid";
import { action } from "utils/safe-action";
import { z } from "zod";

export const createNewTeamAction = action
  .inputSchema(z.instanceof(FormData))
  .action(async ({ parsedInput: input, ctx: { session } }) => {
    const { name, roster, userId, optionalRule } = z
      .object({
        name: z.string().min(1),
        roster: z.string(),
        userId: z.string(), // This will be passed from the hidden input
        optionalRule: z.string().optional(),
      })
      .parse(Object.fromEntries(input.entries()));

    if (!session.activeOrganizationId) throw new Error("No active league");

    const ruleOptions = await db.query.optionalSpecialRuleToRoster.findMany({
      where: eq(optionalSpecialRuleToRoster.rosterName, roster),
    });
    const option = ruleOptions.find(
      (opt) => opt.specialRuleName === optionalRule,
    );
    if (ruleOptions.length > 0 && !option)
      throw new Error("Invalid optional rule selected");

    const activeLeague = session.activeOrganizationId;
    const teamId = nanoid();
    await db.transaction(async (tx) => {
      await tx.insert(team).values({
        name,
        id: teamId,
        rosterName: roster,
        chosenSpecialRuleName: option?.specialRuleName,
        leagueId: activeLeague,
      });
      await tx.insert(coachToTeam).values({
        coachId: userId,
        teamId,
      });
    });

    revalidatePath("/");
    redirect(`/team/${teamId}/edit`);
  });

export const redraftTeam = action
  .inputSchema(z.instanceof(FormData))
  .action(async ({ parsedInput: input }) => {
    const { teamId, userId } = z
      .object({
        teamId: z.string(),
        userId: z.string(),
      })
      .parse(input);

    await db.insert(coachToTeam).values({
      coachId: userId,
      teamId,
    });

    revalidatePath("/");
    redirect(`/team/${teamId}/edit`);
  });

import { coachToTeam, team } from "~/db/schema";
import { db } from "~/app/utils/drizzle";
// import nanoid from "~/utils/nanoid";
// import { action } from "~/utils/safe-action";
import { z } from "zod";
import { createValidatedAction } from "~/app/utils/action";
import nanoid from "~/app/utils/nanoid";
import { Route } from "./+types/create.action";
import { authContext } from "~/app/primary-layout";
import { redirect } from "react-router";

export const action = createValidatedAction(
  z.object({
    name: z.string().min(1),
    roster: z.string(),
    optionalRule: z.string().optional(),
  }),
  async ({ name, roster, optionalRule }, { context }: Route.ActionArgs) => {
    const { session } = context.get(authContext);
    if (!session.activeOrganizationId) {
      throw "No active league";
    }

    const ruleOptions = await db.query.optionalSpecialRuleToRoster.findMany({
      where: { rosterName: roster },
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
        coachId: session.userId,
        teamId,
      });
    });

    throw redirect("/team/" + teamId);
  },
);

// export const redraftTeam = action
//   .inputSchema(z.instanceof(FormData))
//   .action(async ({ parsedInput: input }) => {
//     const inputObject = Object.fromEntries(input.entries());
//     const { teamId, userId } = z
//       .object({
//         teamId: z.string(),
//         userId: z.string(),
//       })
//       .parse(inputObject);
//
//     await db.insert(coachToTeam).values({
//       coachId: userId,
//       teamId,
//     });
//
//     redirect(`/team/${teamId}/edit`);
//   });

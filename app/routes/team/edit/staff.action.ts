import { z } from "zod";
import { createValidatedAction } from "~/app/utils/action";
import { Route } from "./+types/staff.action";
import { db } from "~/app/utils/drizzle";
import { team as dbTeam } from "~/db/schema";
import { eq, sql } from "drizzle-orm";

const staffSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("hire"),
    type: z.enum([
      "apothecary",
      "assistantCoaches",
      "cheerleaders",
      "rerolls",
      "dedicatedFans",
    ]),
    quantity: z.coerce.number().int().gt(0).default(1),
  }),
  z.object({
    action: z.literal("fire"),
    type: z.enum([
      "apothecary",
      "assistantCoaches",
      "cheerleaders",
      "rerolls",
      "dedicatedFans",
    ]),
    quantity: z.coerce.number().int().gt(0).default(1),
  }),
]);

export const action = createValidatedAction(
  staffSchema,
  async (data, { params }: Route.ActionArgs) => {
    const { teamId } = params;

    // Permission check handled by team-permission-middleware layout

    // Route to appropriate handler
    if (data.action === "hire") {
      return hireStaff(teamId, data);
    } else {
      return fireStaff(teamId, data);
    }
  },
);

async function hireStaff(
  teamId: string,
  input: { type: string; quantity: number },
) {
  return db.transaction(async (tx) => {
    const team = await tx.query.team.findFirst({
      where: { id: teamId },
      with: {
        roster: {
          columns: { rerollCost: true },
          with: { specialRuleToRoster: true },
        },
      },
      columns: {
        state: true,
        treasury: true,
        rerolls: true,
        apothecary: true,
        cheerleaders: true,
        assistantCoaches: true,
        dedicatedFans: true,
      },
    });
    if (!team) throw new Error("Team not found");

    if (team.state !== "draft" && team.state !== "hiring")
      throw new Error("Team cannot hire staff right now");
    if (
      input.type === "apothecary" &&
      !team.roster.specialRuleToRoster.some(
        (rule) => rule.specialRuleName === "Apothecary Allowed",
      )
    )
      throw new Error("Apothecary not allowed for this team");
    if (input.type === "dedicatedFans" && team.state !== "draft")
      throw new Error("Cannot purchase dedicated fans after draft");

    const baseRerollCost = team.roster.rerollCost;
    const costMap = {
      apothecary: 50_000,
      assistantCoaches: 10_000,
      cheerleaders: 10_000,
      rerolls: team.state === "draft" ? baseRerollCost : baseRerollCost * 2,
      dedicatedFans: 10_000,
    };
    const cost = costMap[input.type as keyof typeof costMap] * input.quantity;

    await tx
      .update(dbTeam)
      .set({
        [input.type]:
          input.type === "apothecary"
            ? true
            : sql`${dbTeam[input.type as keyof typeof dbTeam]} + ${input.quantity}`,
        treasury: sql`${dbTeam.treasury} - ${cost}`,
      })
      .where(eq(dbTeam.id, teamId));

    const updatedTeam = await tx.query.team.findFirst({
      where: { id: teamId },
      columns: {
        treasury: true,
        rerolls: true,
        apothecary: true,
        cheerleaders: true,
        assistantCoaches: true,
        dedicatedFans: true,
      },
    });
    if (!updatedTeam) throw new Error("Failed to select team after update");

    if (updatedTeam.treasury < 0)
      throw new Error("Not enough money in treasury");

    const maxMap = {
      apothecary: 1,
      assistantCoaches: 6,
      cheerleaders: 12,
      rerolls: 8,
      dedicatedFans: 6,
    };
    if (
      Number(updatedTeam[input.type as keyof typeof updatedTeam]) >
      maxMap[input.type as keyof typeof maxMap]
    )
      throw new Error("Maximum exceeded");

    return updatedTeam;
  });
}

async function fireStaff(
  teamId: string,
  input: { type: string; quantity: number },
) {
  return db.transaction(async (tx) => {
    const team = await tx.query.team.findFirst({
      where: { id: teamId },
      columns: {
        state: true,
        name: true,
        treasury: true,
        dedicatedFans: true,
        rerolls: true,
        cheerleaders: true,
        apothecary: true,
        assistantCoaches: true,
      },
      with: {
        roster: { columns: { rerollCost: true } },
      },
    });
    if (!team) throw new Error("Team not found");

    const costMap = {
      apothecary: 50_000,
      assistantCoaches: 10_000,
      cheerleaders: 10_000,
      rerolls: team.roster.rerollCost,
      dedicatedFans: 10_000,
    };

    const [updatedTeam] = await tx
      .update(dbTeam)
      .set({
        [input.type]:
          input.type === "apothecary"
            ? false
            : sql`${dbTeam[input.type as keyof typeof dbTeam]} - ${input.quantity}`,
        treasury:
          team.state === "draft"
            ? sql`${dbTeam.treasury} + ${
                costMap[input.type as keyof typeof costMap] * input.quantity
              }`
            : undefined,
      })
      .where(eq(dbTeam.id, teamId))
      .returning({
        state: dbTeam.state,
        apothecary: dbTeam.apothecary,
        assistantCoaches: dbTeam.assistantCoaches,
        cheerleaders: dbTeam.cheerleaders,
        dedicatedFans: dbTeam.dedicatedFans,
        rerolls: dbTeam.rerolls,
      });

    if (!updatedTeam) throw new Error("Failed to select team after update");

    if (updatedTeam.state !== "draft" && updatedTeam.state !== "hiring")
      throw new Error("Team cannot fire staff right now");
    if (Number(updatedTeam[input.type as keyof typeof updatedTeam]) < 0)
      throw new Error("Not enough staff to fire");
    if (input.type === "dedicatedFans" && updatedTeam.state !== "draft")
      throw new Error("Cannot purchase dedicated fans after draft");
    if (updatedTeam.dedicatedFans > 6)
      throw new Error("Cannot have more than 6 dedicated fans");
    if (updatedTeam.dedicatedFans < 1)
      throw new Error("Cannot have less than 1 dedicated fans");

    return updatedTeam;
  });
}

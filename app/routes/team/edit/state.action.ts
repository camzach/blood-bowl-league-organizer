import { z } from "zod";
import { createValidatedAction } from "~/app/utils/action";
import { Route } from "./+types/state.action";
import { db } from "~/app/utils/drizzle";
import { team as dbTeam, player as dbPlayer } from "~/db/schema";
import { and, eq, sql } from "drizzle-orm";

const stateSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("done-improving"),
  }),
  z.object({
    action: z.literal("ready"),
  }),
]);

export const action = createValidatedAction(
  stateSchema,
  async (data, { params }: Route.ActionArgs) => {
    const { teamId } = params;

    // Permission check handled by team-permission-middleware layout

    // Route to appropriate handler
    if (data.action === "done-improving") {
      return doneImproving(teamId);
    } else {
      return ready(teamId);
    }
  },
);

async function doneImproving(teamId: string) {
  return db.transaction(async (tx) => {
    const team = await tx.query.team.findFirst({
      where: { id: teamId },
      columns: {
        id: true,
        state: true,
      },
      with: {
        players: {
          with: {
            pendingRandomSkill: true,
            pendingRandomStat: true,
          },
        },
      },
    });
    if (!team) throw new Error("Team not found");
    if (team.state !== "improving")
      throw new Error("Team not in Improving state");

    if (
      team.players.some((p) => p.pendingRandomSkill || p.pendingRandomStat)
    ) {
      throw new Error(
        "One or more players has pending improvements that must be confirmed",
      );
    }

    await tx
      .update(dbTeam)
      .set({ state: "hiring" })
      .where(eq(dbTeam.id, team.id));

    return { success: true };
  });
}

async function ready(teamId: string) {
  return db.transaction(async (tx) => {
    const team = await tx.query.team.findFirst({
      where: { id: teamId },
      columns: {
        name: true,
        state: true,
        treasury: true,
      },
      with: {
        players: {
          where: { membershipType: "player" },
          with: {
            position: {
              with: {
                skills: true,
              },
            },
          },
        },
      },
    });
    if (!team) throw new Error("Team not found");

    const insignificantPlayers = team.players.filter((p) =>
      p.position.skills.some((s) => s.name === "Insignificant"),
    ).length;

    if (insignificantPlayers > team.players.length / 2) {
      throw new Error(
        "You may not have more players with Insignificant than without",
      );
    }

    if (team.state !== "draft" && team.state !== "hiring")
      throw new Error("Team not in Draft or Hiring state");
    if (team.state === "draft" && team.players.length < 11)
      throw new Error("11 players required to draft a team");

    const expensiveMistakesFunctions: Record<string, (g: number) => number> = {
      "Crisis Averted": () => 0,
      "Minor Incident": () => Math.ceil(Math.random() * 3) * 10_000,
      "Major Incident": (g) => Math.floor(g / 5_000 / 2) * 5_000,
      Catastrophe: (g) =>
        g -
        (Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6)) *
          10_000,
    };
    const expensiveMistakesTable = [
      [
        "Crisis Averted",
        "Crisis Averted",
        "Crisis Averted",
        "Crisis Averted",
        "Crisis Averted",
        "Crisis Averted",
      ],
      [
        "Minor Incident",
        "Crisis Averted",
        "Crisis Averted",
        "Crisis Averted",
        "Crisis Averted",
        "Crisis Averted",
      ],
      [
        "Minor Incident",
        "Minor Incident",
        "Crisis Averted",
        "Crisis Averted",
        "Crisis Averted",
        "Crisis Averted",
      ],
      [
        "Major Incident",
        "Minor Incident",
        "Minor Incident",
        "Crisis Averted",
        "Crisis Averted",
        "Crisis Averted",
      ],
      [
        "Major Incident",
        "Major Incident",
        "Minor Incident",
        "Minor Incident",
        "Crisis Averted",
        "Crisis Averted",
      ],
      [
        "Catastrophe",
        "Major Incident",
        "Major Incident",
        "Minor Incident",
        "Minor Incident",
        "Crisis Averted",
      ],
      [
        "Catastrophe",
        "Catastrophe",
        "Major Incident",
        "Major Incident",
        "Major Incident",
        "Major Incident",
      ],
    ] as const;
    const expensiveMistakeRoll = Math.floor(Math.random() * 6);
    const expensiveMistake =
      team.state === "draft"
        ? null
        : expensiveMistakesTable[
            Math.min(Math.floor(team.treasury / 100_000), 6)
          ][expensiveMistakeRoll];
    const expensiveMistakesCost =
      expensiveMistake !== null
        ? expensiveMistakesFunctions[expensiveMistake](team.treasury)
        : 0;

    await Promise.all([
      tx
        .update(dbTeam)
        .set({
          state: "ready",
          treasury: sql`${dbTeam.treasury} - ${expensiveMistakesCost}`,
        })
        .where(eq(dbTeam.id, teamId)),
      tx
        .update(dbPlayer)
        .set({ membershipType: null, teamId: null })
        .where(
          and(
            eq(dbPlayer.teamId, teamId),
            eq(dbPlayer.membershipType, "journeyman"),
          ),
        ),
    ]);

    return {
      expensiveMistake,
      expensiveMistakesCost,
      // Roll should appear to the user as 1-6 instead of 0-5
      expensiveMistakeRoll: expensiveMistakeRoll + 1,
    };
  });
}

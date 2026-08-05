import { z } from "zod";
import { createValidatedAction } from "~/app/utils/action";
import { Route } from "./+types/update.action";
import { db } from "~/app/utils/drizzle";
import { player as dbPlayer } from "~/db/schema";
import { eq } from "drizzle-orm";

const updateSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("info"),
    number: z.coerce.number().min(1).max(16).optional(),
    name: z.string().min(1).optional(),
  }),
  z.object({
    action: z.literal("captain"),
  }),
]);

export const action = createValidatedAction(
  updateSchema,
  async (data, { params }: Route.ActionArgs) => {
    const { playerId } = params;

    // Team permission check handled by team-permission-middleware layout

    // Route to appropriate handler
    if (data.action === "info") {
      return updatePlayerInfo(playerId, data);
    } else {
      return makeCaptain(playerId);
    }
  },
);

async function updatePlayerInfo(
  playerId: string,
  input: { number?: number; name?: string },
) {
  return db.transaction(async (tx) => {
    const player = await tx.query.player.findFirst({
      where: { id: playerId },
      columns: {
        membershipType: true,
        number: true,
        name: true,
      },
      with: {
        team: { columns: { state: true, id: true } },
        improvements: {
          with: { skill: true },
        },
        position: {
          with: { skills: true },
        },
      },
    });
    if (!player) throw new Error("Player does not exist");

    if (player.team === null || player.membershipType !== "player")
      throw new Error("Player is not on any team");

    if (!["hiring", "improving", "draft"].includes(player.team.state))
      throw new Error("Team is not modifiable at this time");

    const otherPlayer =
      input.number !== undefined &&
      (await tx.query.player.findFirst({
        where: {
          number: input.number,
          teamId: player.team!.id,
          membershipType: "player",
        },
        columns: { id: true },
      }));

    const mutations = [
      tx
        .update(dbPlayer)
        .set({
          number: input.number,
          name: input.name,
        })
        .where(eq(dbPlayer.id, playerId)),
      otherPlayer &&
        tx
          .update(dbPlayer)
          .set({
            number: player.number,
          })
          .where(eq(dbPlayer.id, otherPlayer.id)),
    ];

    await Promise.all(mutations);

    return { success: true };
  });
}

async function makeCaptain(playerId: string) {
  return db.transaction(async (tx) => {
    const player = await tx.query.player.findFirst({
      where: { id: playerId },
      columns: {
        teamId: true,
        isCaptain: true,
      },
      with: {
        team: {
          with: { roster: { with: { specialRuleToRoster: true } } },
        },
        position: {
          with: {
            keywords: true,
          },
        },
      },
    });

    if (!player) throw new Error("Player not found");
    if (!player.teamId) throw new Error("Player not on a team");
    if (!player.team) throw new Error("Team not found");
    if (!player.position)
      throw new Error("Could not identify player position");

    if (
      !player.team.roster.specialRuleToRoster.some(
        (r) => r.specialRuleName === "Team Captain",
      )
    ) {
      throw new Error("This team's roster does not allow a captain.");
    }

    if (player.position.keywords.some((k) => k.name === "Big Guy")) {
      throw new Error("A Big Guy cannot be a captain.");
    }

    if (player.team.state === "draft") {
      await tx
        .update(dbPlayer)
        .set({ isCaptain: false })
        .where(eq(dbPlayer.teamId, player.teamId));
    } else if (
      await tx.query.player.findFirst({
        where: { teamId: player.teamId, isCaptain: true },
      })
    ) {
      throw new Error("Team already has a captain");
    }

    await tx
      .update(dbPlayer)
      .set({ isCaptain: true })
      .where(eq(dbPlayer.id, playerId));

    return { success: true };
  });
}

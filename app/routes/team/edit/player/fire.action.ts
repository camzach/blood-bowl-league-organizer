import { z } from "zod";
import { createValidatedAction } from "~/app/utils/action";
import { Route } from "./+types/fire.action";
import { db } from "~/app/utils/drizzle";
import { player as dbPlayer, team as dbTeam } from "~/db/schema";
import { eq, sql } from "drizzle-orm";
import { canFirePlayer } from "~/app/utils/can-fire-player";

const fireSchema = z.object({});

export const action = createValidatedAction(
  fireSchema,
  async (data, { params }: Route.ActionArgs) => {
    const { playerId } = params;

    // Team permission check handled by team-permission-middleware layout

    return firePlayer(playerId);
  },
);

async function firePlayer(playerId: string) {
  return db.transaction(async (tx) => {
    const player = await tx.query.player.findFirst({
      where: { id: playerId },
      columns: {
        membershipType: true,
        id: true,
        teamId: true,
        isCaptain: true,
        agInjuries: true,
        stInjuries: true,
        avInjuries: true,
        maInjuries: true,
      },
      with: {
        position: { columns: { cost: true } },
        team: { columns: { state: true, id: true, treasury: true } },
      },
    });
    if (!player) throw new Error("Player does not exist");
    if (player.team === null) throw new Error("Player is not on any team");

    if (player.isCaptain) {
      const hasInjury =
        player.agInjuries > 0 ||
        player.stInjuries > 0 ||
        player.avInjuries > 0 ||
        player.maInjuries > 0;
      if (!hasInjury) {
        throw new Error(
          "A captain can only be fired if they have a stat-reducing injury.",
        );
      }
    }

    await tx
      .select({ id: dbTeam.id })
      .from(dbTeam)
      .where(eq(dbTeam.id, player.team.id))
      .for("update");

    const team = await tx.query.team.findFirst({
      where: { id: player.team.id },
      columns: { state: true },
      with: {
        players: {
          columns: { id: true, membershipType: true, missNextGame: true },
        },
      },
    });
    if (!team) throw new Error("Team not found");

    if (team.state !== "draft" && team.state !== "firing")
      throw new Error("Team not in firing state");
    if (!canFirePlayer(team.state, team.players, playerId))
      throw new Error(
        "A team must keep at least 11 players eligible for the next game",
      );

    if (team.state === "draft") {
      await Promise.all([
        tx.delete(dbPlayer).where(eq(dbPlayer.id, playerId)),
        tx
          .update(dbTeam)
          .set({
            treasury: sql`${dbTeam.treasury} + ${player.position.cost}`,
          })
          .where(eq(dbTeam.id, player.team.id)),
      ]);
    } else {
      await tx
        .update(dbPlayer)
        .set({
          teamId: null,
          membershipType: null,
        })
        .where(eq(dbPlayer.id, playerId));
    }

    return { success: true };
  });
}

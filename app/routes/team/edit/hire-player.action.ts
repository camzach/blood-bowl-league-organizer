import { z } from "zod";
import { createValidatedAction } from "~/app/utils/action";
import { Route } from "./+types/hire-player.action";
import { db } from "~/app/utils/drizzle";
import {
  team as dbTeam,
  position as dbPosition,
  rosterSlot,
  player as dbPlayer,
  improvement,
} from "~/db/schema";
import { and, eq, getColumns, sql } from "drizzle-orm";
import nanoid from "~/app/utils/nanoid";
import { getPlayerSppAndTv } from "~/app/utils/get-computed-player-fields";
import { playerForTvCalculation } from "~/db/query-fragments/player.fragments";

const hirePlayerSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("new"),
    position: z.string(),
    number: z.coerce.number().min(1).max(16),
    name: z.string().optional(),
  }),
  z.object({
    action: z.literal("existing"),
    player: z.string(),
    number: z.coerce.number().min(1).max(16),
  }),
]);

export const action = createValidatedAction(
  hirePlayerSchema,
  async (data, { params }: Route.ActionArgs) => {
    const { teamId } = params;

    // Permission check handled by team-permission-middleware layout

    // Route to appropriate handler
    if (data.action === "new") {
      return hireNewPlayer(teamId, data);
    } else {
      return hireExistingPlayer(teamId, data);
    }
  },
);

async function hireNewPlayer(
  teamId: string,
  input: { position: string; number: number; name?: string },
) {
  return db.transaction(async (tx) => {
    const positionQuery = await tx
      .select({
        ...getColumns(dbPosition),
        rosterSlotMax: rosterSlot.max,
      })
      .from(dbPosition)
      .innerJoin(rosterSlot, eq(rosterSlot.id, dbPosition.rosterSlotId))
      .innerJoin(dbTeam, eq(dbTeam.rosterName, rosterSlot.rosterName))
      .where(
        and(eq(dbTeam.id, teamId), eq(dbPosition.name, input.position)),
      )
      .limit(1);

    if (positionQuery.length === 0)
      throw new Error("Position does not exist on this roster");

    const position = positionQuery[0];

    await tx
      .update(dbTeam)
      .set({ treasury: sql`${dbTeam.treasury} - ${position.cost}` })
      .where(eq(dbTeam.id, teamId));

    const newPlayerId = nanoid();
    await tx.insert(dbPlayer).values({
      id: newPlayerId,
      name: input.name,
      number: input.number,
      positionId: position.id,
      teamId: teamId,
      membershipType: "player",
    });

    const team = await tx.query.team.findFirst({
      where: { id: teamId },
      columns: { treasury: true, state: true },
      with: {
        players: {
          columns: { number: true },
          where: { membershipType: "player" },
          with: {
            position: {
              columns: {},
              with: { rosterSlot: true },
            },
          },
        },
      },
    });
    if (!team) throw new Error("Team not found");

    if (team.treasury < 0) {
      throw new Error("Cannot afford this player");
    }

    if (team.state !== "draft" && team.state !== "hiring")
      throw new Error("Team cannot hire new players right now");

    if (team.players.length > 16) throw new Error("Team roster already full");

    if (
      team.players.filter(
        (p) => p.position.rosterSlot.id === position.rosterSlotId,
      ).length > position.rosterSlotMax
    )
      throw new Error("Maximum positionals already rostered");

    if (team.players.filter((p) => p.number === input.number).length > 1)
      throw new Error("Player with this number already exists");

    return { playerId: newPlayerId };
  });
}

async function hireExistingPlayer(
  teamId: string,
  input: { player: string; number: number },
) {
  return db.transaction(async (tx) => {
    const player = await tx.query.player.findFirst({
      where: { id: input.player, NOT: { membershipType: "player" } },
      with: {
        ...playerForTvCalculation.with,
        team: true,
      },
    });
    if (!player) throw new Error("Player not found");
    if (!player.team) throw new Error("Player not available for any team");

    const { teamValue } = getPlayerSppAndTv(player);
    const cost = teamValue + player.seasonsPlayed * 20_000;

    const oldTeam = await tx.query.team.findFirst({
      where: { id: player.team.id },
      columns: {
        treasury: true,
      },
    });
    if (!oldTeam) throw new Error("Team not found");

    await Promise.all([
      tx
        .update(dbTeam)
        .set({
          treasury: sql`${dbTeam.treasury} - ${cost}`,
        })
        .where(eq(dbTeam.id, player.team.id)),
      tx
        .update(dbPlayer)
        .set({ membershipType: "player", number: input.number })
        .where(eq(dbPlayer.id, player.id)),
      tx
        .delete(improvement)
        .where(
          and(
            eq(improvement.playerId, player.id),
            eq(improvement.skillName, "Loner (4+)"),
          ),
        ),
    ]);

    const updatedTeam = await tx.query.team.findFirst({
      where: { id: player.team.id },
      columns: { treasury: true },
      with: {
        players: {
          where: { membershipType: "player" },
          with: { position: { with: { rosterSlot: true } } },
        },
      },
    });
    if (!updatedTeam) throw new Error("Failed to select after update");

    if (updatedTeam.players.length > 16)
      throw new Error("Team cannot hire any more players");
    if (
      updatedTeam.players.filter(
        (p) => p.position.rosterSlotId === player.position.rosterSlotId,
      ).length > player.position.rosterSlot.max
    )
      throw new Error("Cannot hire any more players of this position");
    if (
      updatedTeam.players.filter((p) => p.number === input.number).length > 1
    )
      throw new Error("Team already has a player with this number");
    if (updatedTeam.treasury < 0)
      throw new Error("Team cannot afford this player");

    return { playerId: player.id };
  });
}

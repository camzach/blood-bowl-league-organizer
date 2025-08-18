"use server";
import { z } from "zod";
import {
  action,
  teamPermissionMiddleware,
  playerPermissionMiddleware,
} from "utils/safe-action";
import { db } from "utils/drizzle";
import {
  coachToTeam,
  team as dbTeam,
  position as dbPosition,
  rosterSlot,
  player as dbPlayer,
  improvement,
} from "db/schema";
import { and, eq, getTableColumns, not, sql } from "drizzle-orm";
import nanoid from "utils/nanoid";
import { getPlayerSppAndTv } from "utils/get-computed-player-fields";

export const create = action
  .inputSchema(z.object({ name: z.string().min(1), roster: z.string() }))
  .action(async ({ parsedInput: input, ctx: { user, session } }) => {
    if (!session.activeOrganizationId) throw new Error("No active league");
    const activeLeague = session.activeOrganizationId;
    const { name: teamName, roster } = input;
    try {
      return db.transaction(async (tx) => {
        const teamId = nanoid();
        const insertedTeam = await tx.insert(dbTeam).values({
          name: teamName,
          id: teamId,
          rosterName: roster,
          leagueId: activeLeague,
        });
        await tx.insert(coachToTeam).values({
          teamId,
          coachId: user.id,
        });
        return insertedTeam;
      });
    } catch (e) {
      if (e instanceof Error && "errno" in e) {
        if (e.errno == 1062)
          throw new Error("Team with this name already exists!");
      }
    }
  });

export const hirePlayer = action
  .inputSchema(
    z.object({
      teamId: z.string(),
      position: z.string(),
      number: z.number().min(1).max(16),
      name: z.string().optional(),
    }),
  )
  .use(async ({ next, clientInput }) => {
    const { teamId } = z.object({ teamId: z.string() }).parse(clientInput);
    return next({ ctx: { authParams: { teamId: teamId } } });
  })
  .use(teamPermissionMiddleware)
  .action(async ({ parsedInput: input }) => {
    return db.transaction(async (tx) => {
      const positionQuery = await db
        .select({
          ...getTableColumns(dbPosition),
          rosterSlotMax: rosterSlot.max,
        })
        .from(dbPosition)
        .innerJoin(rosterSlot, eq(rosterSlot.id, dbPosition.rosterSlotId))
        .innerJoin(dbTeam, eq(dbTeam.rosterName, rosterSlot.rosterName))
        .where(
          and(eq(dbTeam.id, input.teamId), eq(dbPosition.name, input.position)),
        )
        .limit(1);

      if (positionQuery.length === 0)
        throw new Error("Position does not exist on this roster");

      const position = positionQuery[0];

      await tx
        .update(dbTeam)
        .set({ treasury: sql`${dbTeam.treasury} - ${position.cost}` })
        .where(eq(dbTeam.id, input.teamId));

      const newPlayerId = nanoid();
      await tx.insert(dbPlayer).values({
        id: newPlayerId,
        name: input.name,
        number: input.number,
        positionId: position.id,
        teamId: input.teamId,
        membershipType: "player",
      });

      const team = await tx.query.team.findFirst({
        where: eq(dbTeam.id, input.teamId),
        columns: { treasury: true, state: true },
        with: {
          players: {
            columns: { number: true },
            where: eq(dbPlayer.membershipType, "player"),
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
    });
  });

export const hireStaff = action
  .inputSchema(
    z.object({
      teamId: z.string(),
      type: z.enum([
        "apothecary",
        "assistantCoaches",
        "cheerleaders",
        "rerolls",
        "dedicatedFans",
      ]),
      quantity: z.number().int().gt(0).default(1),
    }),
  )
  .use(async ({ next, clientInput }) => {
    const { teamId } = z.object({ teamId: z.string() }).parse(clientInput);
    return next({ ctx: { authParams: { teamId: teamId } } });
  })
  .use(teamPermissionMiddleware)
  .action(async ({ parsedInput: input }) => {
    return db.transaction(async (tx) => {
      const team = await db.query.team.findFirst({
        where: eq(dbTeam.id, input.teamId),
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
        throw new Error("Cannot purchase deidcated fans after draft");

      const baseRerollCost = team.roster.rerollCost;
      const costMap = {
        apothecary: 50_000,
        assistantCoaches: 10_000,
        cheerleaders: 10_000,
        rerolls: team.state === "draft" ? baseRerollCost : baseRerollCost * 2,
        dedicatedFans: 10_000,
      };
      const cost = costMap[input.type] * input.quantity;

      await tx
        .update(dbTeam)
        .set({
          [input.type]:
            input.type === "apothecary"
              ? true
              : sql`${dbTeam[input.type]} + ${input.quantity}`,
          treasury: sql`${dbTeam.treasury} - ${cost}`,
        })
        .where(eq(dbTeam.id, input.teamId));

      const updatedTeam = await tx.query.team.findFirst({
        where: eq(dbTeam.id, input.teamId),
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
      if (Number(updatedTeam[input.type]) > maxMap[input.type])
        throw new Error("Maximum exceeded");

      return updatedTeam;
    });
  });

export const hireExistingPlayer = action
  .inputSchema(
    z.object({
      player: z.string(),
      number: z.number().min(1).max(16),
    }),
  )
  .use(async ({ next, clientInput }) => {
    const { player: playerId } = z
      .object({ player: z.string() })
      .parse(clientInput);
    return next({ ctx: { authParams: { playerId: playerId } } });
  })
  .use(playerPermissionMiddleware)
  .action(async ({ parsedInput: input }) => {
    return db.transaction(async (tx) => {
      const player = await tx.query.player.findFirst({
        where: and(
          eq(dbPlayer.id, input.player),
          not(eq(dbPlayer.membershipType, "player")),
        ),
        with: {
          team: true,
          improvements: { with: { skill: true } },
          position: {
            with: {
              rosterSlot: {
                with: { roster: { with: { specialRuleToRoster: true } } },
              },
            },
          },
        },
      });
      if (!player) throw new Error("Player not found");
      if (!player.team) throw new Error("Player not available for any team");

      const { teamValue } = getPlayerSppAndTv(player);
      const cost = teamValue + player.seasonsPlayed * 20_000;

      const oldTeam = await tx.query.team.findFirst({
        where: eq(dbTeam.id, player.team.id),
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
        where: eq(dbTeam.id, player.team.id),
        columns: { treasury: true },
        with: {
          players: {
            where: eq(dbPlayer.membershipType, "player"),
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
    });
  });

export const fireStaff = action
  .inputSchema(
    z.object({
      teamId: z.string(),
      type: z.enum([
        "apothecary",
        "assistantCoaches",
        "cheerleaders",
        "rerolls",
        "dedicatedFans",
      ]),
      quantity: z.number().int().gt(0).default(1),
    }),
  )
  .use(async ({ next, clientInput }) => {
    const { teamId } = z.object({ teamId: z.string() }).parse(clientInput);
    return next({ ctx: { authParams: { teamId: teamId } } });
  })
  .use(teamPermissionMiddleware)
  .action(async ({ parsedInput: input }) => {
    return db.transaction(async (tx) => {
      const team = await tx.query.team.findFirst({
        where: eq(dbTeam.id, input.teamId),
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
              : sql`${dbTeam[input.type]} - ${input.quantity}`,
          treasury:
            team.state === "draft"
              ? sql`${dbTeam.treasury} + ${
                  costMap[input.type] * input.quantity
                }`
              : undefined,
        })
        .where(eq(dbTeam.id, input.teamId))
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
      if (Number(updatedTeam[input.type]) < 0)
        throw new Error("Not enough staff to fire");
      if (input.type === "dedicatedFans" && updatedTeam.state !== "draft")
        throw new Error("Cannot purchase deidcated fans after draft");
      if (updatedTeam.dedicatedFans > 6)
        throw new Error("Cannot have more than 6 dedicated fans");
      if (updatedTeam.dedicatedFans < 1)
        throw new Error("Cannot have less than 1 dedicated fans");

      return updatedTeam;
    });
  });

export const doneImproving = action
  .inputSchema(z.string())
  .use(async ({ next, clientInput }) => {
    const teamId = z.string().parse(clientInput);
    return next({ ctx: { authParams: { teamId: teamId } } });
  })
  .use(teamPermissionMiddleware)
  .action(async ({ parsedInput: input }) => {
    return db.transaction(async (tx) => {
      const team = await tx.query.team.findFirst({
        where: eq(dbTeam.id, input),
        columns: {
          id: true,
          state: true,
        },
      });
      if (!team) throw new Error("Team not found");
      if (team.state !== "improving")
        throw new Error("Team not in Improving state");

      await tx
        .update(dbTeam)
        .set({ state: "hiring" })
        .where(eq(dbTeam.id, team.id));

      return true;
    });
  });

export const ready = action
  .inputSchema(z.string())
  .use(async ({ next, clientInput }) => {
    const teamId = z.string().parse(clientInput);
    return next({ ctx: { authParams: { teamId: teamId } } });
  })
  .use(teamPermissionMiddleware)
  .action(async ({ parsedInput: input }) => {
    return db.transaction(async (tx) => {
      const team = await tx.query.team.findFirst({
        where: eq(dbTeam.id, input),
        columns: {
          name: true,
          state: true,
          treasury: true,
        },
        with: { players: { where: eq(dbPlayer.membershipType, "player") } },
      });
      if (!team) throw new Error("Team not found");
      if (team.state !== "draft" && team.state !== "hiring")
        throw new Error("Team not in Draft or Hiring state");
      if (team.state === "draft" && team.players.length < 11)
        throw new Error("11 players required to draft a team");

      const expensiveMistakesFunctions: Record<string, (g: number) => number> =
        {
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
          .where(eq(dbTeam.id, input)),
        tx
          .update(dbPlayer)
          .set({ membershipType: null, teamId: null })
          .where(
            and(
              eq(dbPlayer.teamId, input),
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
  });

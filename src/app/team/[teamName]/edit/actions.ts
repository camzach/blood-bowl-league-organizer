"use server";
import { z } from "zod";
import { zact } from "zact/server";
import drizzle from "utils/drizzle";
import {
  coachToTeam,
  team as dbTeam,
  position as dbPosition,
  rosterSlot,
  player,
} from "db/schema";
import { auth } from "@clerk/nextjs";
import { and, eq, sql } from "drizzle-orm";
import nanoid from "utils/nanoid";

async function getUserTeams(tx?: typeof drizzle) {
  const { userId } = auth();
  if (!userId) throw new Error("Not authenticated");

  return (tx ?? drizzle).query.coachToTeam.findMany({
    where: eq(coachToTeam.coachId, userId),
  });
}

export async function canEditTeam(team: string, tx?: typeof drizzle) {
  const editableTeams = await getUserTeams(tx);
  return editableTeams.some((e) => e.teamName === team);
}

export const create = zact(
  z.object({ name: z.string().min(1), roster: z.string() })
)(async (input) => {
  const { userId } = auth();
  if (!userId) throw new Error("Not authenticated");
  const { name: teamName, roster } = input;
  try {
    return drizzle.transaction(async (tx) => {
      const insertedTeam = await tx.insert(dbTeam).values({
        name: teamName,
        rosterName: roster,
      });
      await tx.insert(coachToTeam).values({
        teamName,
        coachId: userId,
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

export const hirePlayer = zact(
  z.object({
    team: z.string(),
    position: z.string(),
    number: z.number().min(1).max(16),
    name: z.string().optional(),
  })
)(async (input) => {
  return drizzle.transaction(async (tx) => {
    if (!(await canEditTeam(input.team)))
      throw new Error("User does not have permission to modify this team");

    const positionQuery = await drizzle
      .select({
        ...(dbPosition as typeof dbPosition._.columns),
        rosterSlotMax: rosterSlot.max,
      })
      .from(dbPosition)
      .innerJoin(rosterSlot, eq(rosterSlot.id, dbPosition.rosterSlotId))
      .innerJoin(dbTeam, eq(dbTeam.rosterName, rosterSlot.rosterName))
      .where(
        and(eq(dbTeam.name, input.team), eq(dbPosition.name, input.position))
      )
      .limit(1);

    if (positionQuery.length === 0)
      throw new Error("Position does not exist on this roster");

    const position = positionQuery[0];

    await tx
      .update(dbTeam)
      .set({ treasury: sql`${dbTeam.treasury} - ${position.cost}` })
      .where(eq(dbTeam.name, input.team));

    await tx.insert(player).values({
      id: nanoid(),
      name: input.name,
      number: input.number,
      positionId: position.id,
      teamName: input.team,
      membershipType: "player",
    });

    const team = await tx.query.team.findFirst({
      where: eq(dbTeam.name, input.team),
      columns: { treasury: true, state: true },
      with: {
        players: {
          columns: { number: true },
          where: eq(player.membershipType, "player"),
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
        (p) => p.position.rosterSlot.id === position.rosterSlotId
      ).length > position.rosterSlotMax
    )
      throw new Error("Maximum positionals already rostered");

    if (team.players.filter((p) => p.number === input.number).length > 1)
      throw new Error("Player with this number already exists");
  });
});

export const hireStaff = zact(
  z.object({
    team: z.string(),
    type: z.enum([
      "apothecary",
      "assistantCoaches",
      "cheerleaders",
      "rerolls",
      "dedicatedFans",
    ]),
    quantity: z.number().int().gt(0).default(1),
  })
)(async (input) => {
  if (!(await canEditTeam(input.team)))
    throw new Error("User does not have permission to modify this team");

  return drizzle.transaction(async (tx) => {
    const team = await drizzle.query.team.findFirst({
      where: eq(dbTeam.name, input.team),
      with: {
        roster: {
          columns: { rerollCost: true },
          with: { specialRuleToRoster: true },
        },
      },
      columns: { state: true },
    });
    if (!team) throw new Error("Team not found");

    if (team.state !== "draft" && team.state !== "hiring")
      throw new Error("Team cannot hire staff right now");
    if (
      input.type === "apothecary" &&
      !team.roster.specialRuleToRoster.some(
        (rule) => rule.specialRuleName === "Apothecary Allowed"
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

    await tx.update(dbTeam).set({
      [input.type]:
        input.type === "apothecary"
          ? true
          : sql`${dbTeam[input.type]} + ${input.quantity}`,
      treasury: sql`${dbTeam.treasury} - ${cost}`,
    });

    const updatedTeam = await tx.query.team.findFirst({
      where: eq(dbTeam.name, input.team),
      columns: {
        treasury: true,
        apothecary: true,
        assistantCoaches: true,
        cheerleaders: true,
        rerolls: true,
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

// export const hireExistingPlayer = zact(
//   z.object({
//     team: z.string(),
//     player: z.string(),
//     number: z.number().min(1).max(16),
//     from: z.enum(["journeymen", "redrafts"]).default("journeymen"),
//   })
// )(async (input) => {
//   const session = await getSessionOrThrow();
//   if (!session.user.teams.includes(input.team))
//     throw new Error("User does not have permission to modify this team");

//   const hiredPlayerQuery = {
//     select: {
//       id: true,
//       position: { select: { id: true, max: true } },
//       teamValue: true,
//       seasonsPlayed: true,
//     },
//   };

//   return prisma.$transaction(async (tx) => {
//     const team = await tx.team.findUniqueOrThrow({
//       where: { name: input.team },
//       select: {
//         journeymen: hiredPlayerQuery,
//         redrafts: hiredPlayerQuery,
//       },
//     });

//     const player = team[input.from].find((p) => p.id === input.player);
//     if (!player) throw new Error("Invalid Player ID");

//     const cost = player.teamValue + player.seasonsPlayed * 20_000;

//     const updatedTeam = await tx.team.update({
//       where: { name: input.team },
//       data: {
//         [input.from]: { disconnect: { id: player.id } },
//         players: { connect: { id: player.id } },
//         treasury: { decrement: cost },
//       },
//       include: { players: true },
//     });

//     if (updatedTeam.players.length > 16)
//       throw new Error("Team cannor hire any more players");
//     if (
//       updatedTeam.players.filter((p) => p.positionId === player.position.id)
//         .length > player.position.max
//     )
//       throw new Error("Cannot hire any more players of this position");
//     if (updatedTeam.players.filter((p) => p.number === input.number).length > 1)
//       throw new Error("Team already has a player with this number");
//     if (updatedTeam.treasury < 0)
//       throw new Error("Team cannot afford this player");

//     const updatedPlayer = await tx.player.update({
//       where: { id: player.id },
//       data: { number: input.number },
//     });

//     return [updatedTeam, updatedPlayer];
//   });
// });

export const fireStaff = zact(
  z.object({
    team: z.string(),
    type: z.enum([
      "apothecary",
      "assistantCoaches",
      "cheerleaders",
      "rerolls",
      "dedicatedFans",
    ]),
    quantity: z.number().int().gt(0).default(1),
  })
)(async (input) => {
  return drizzle.transaction(async (tx) => {
    if (!canEditTeam(input.team, tx))
      throw new Error("User does not have permission to modify this team");
    const team = await tx.query.team.findFirst({
      where: eq(dbTeam.name, input.team),
      columns: { state: true, name: true },
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

    await tx
      .update(dbTeam)
      .set({
        [input.type]:
          input.type === "apothecary"
            ? false
            : sql`${dbTeam[input.type]} - ${input.quantity}`,
        treasury:
          team.state === "draft"
            ? sql`${dbTeam.treasury} + ${costMap[input.type] * input.quantity}`
            : undefined,
      })
      .where(eq(dbTeam.name, input.team));

    const updatedTeam = await tx.query.team.findFirst({
      where: eq(dbTeam.name, input.team),
      columns: {
        state: true,
        apothecary: true,
        assistantCoaches: true,
        cheerleaders: true,
        dedicatedFans: true,
        rerolls: true,
      },
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

    return updatedTeam;
  });
});

// export const ready = zact(z.string())(async (input) => {
//   const session = await getSessionOrThrow();
//   if (!session.user.teams.includes(input))
//     throw new Error("User does not have permission to modify this team");
//   const team = await prisma.team.findUniqueOrThrow({
//     where: { name: input },
//     select: {
//       name: true,
//       state: true,
//       treasury: true,
//       _count: { select: { players: true } },
//     },
//   });
//   if (team.state !== TeamState.Draft && team.state !== TeamState.PostGame)
//     throw new Error("Team not in Draft or PostGame state");
//   if (team.state === TeamState.Draft && team._count.players < 11)
//     throw new Error("11 players required to draft a team");

//   const expensiveMistakesFunctions: Record<string, (g: number) => number> = {
//     "Crisis Averted": () => 0,
//     "Minor Incident": () => Math.ceil(Math.random() * 3) * 10_000,
//     "Major Incident": (g) => Math.floor(g / 5_000 / 2) * 5_000,
//     Catastrophe: (g) =>
//       g -
//       (Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6)) * 10_000,
//   };
//   const expensiveMistakesTable = [
//     [
//       "Crisis Averted",
//       "Crisis Averted",
//       "Crisis Averted",
//       "Crisis Averted",
//       "Crisis Averted",
//       "Crisis Averted",
//     ],
//     [
//       "Minor Incident",
//       "Crisis Averted",
//       "Crisis Averted",
//       "Crisis Averted",
//       "Crisis Averted",
//       "Crisis Averted",
//     ],
//     [
//       "Minor Incident",
//       "Minor Incident",
//       "Crisis Averted",
//       "Crisis Averted",
//       "Crisis Averted",
//       "Crisis Averted",
//     ],
//     [
//       "Major Incident",
//       "Minor Incident",
//       "Minor Incident",
//       "Crisis Averted",
//       "Crisis Averted",
//       "Crisis Averted",
//     ],
//     [
//       "Major Incident",
//       "Major Incident",
//       "Minor Incident",
//       "Minor Incident",
//       "Crisis Averted",
//       "Crisis Averted",
//     ],
//     [
//       "Catastrophe",
//       "Major Incident",
//       "Major Incident",
//       "Minor Incident",
//       "Minor Incident",
//       "Crisis Averted",
//     ],
//     [
//       "Catastrophe",
//       "Catastrophe",
//       "Major Incident",
//       "Major Incident",
//       "Major Incident",
//       "Major Incident",
//     ],
//   ] as const;
//   const expensiveMistakeRoll = Math.floor(Math.random() * 6);
//   const expensiveMistake =
//     team.state === TeamState.Draft
//       ? null
//       : expensiveMistakesTable[
//           Math.min(Math.floor(team.treasury / 100_000), 6)
//         ][expensiveMistakeRoll];
//   const expensiveMistakesCost =
//     expensiveMistake !== null
//       ? expensiveMistakesFunctions[expensiveMistake](team.treasury)
//       : 0;
//   return prisma.team
//     .update({
//       where: { name: team.name },
//       data: {
//         state: "Ready",
//         treasury: { decrement: expensiveMistakesCost },
//         journeymen: { set: [] },
//         redrafts: { set: [] },
//       },
//     })
//     .then(() => ({
//       expensiveMistake,
//       expensiveMistakesCost,
//       // Roll should appear to the user as 1-6 instead of 0-5
//       expensiveMistakeRoll: expensiveMistakeRoll + 1,
//     }));
// });

import { Prisma, TeamState } from '@prisma/client';
import { prisma } from './prisma-singleton';
import { z } from 'zod';
import { publicProcedure, router } from './trpc';
import { newPlayer } from './new-player';

export const teamRouter = router({
  create: publicProcedure
    .input(z.object({ name: z.string().min(1), roster: z.string() }))
    .mutation(async req => {
      const { name, roster } = req.input;
      const team = await prisma.team.create({
        data: {
          name,
          roster: { connect: { name: roster } },
        },
      }).catch(err => {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          switch (err.code) {
            case 'P2002':
              throw new Error('A team with this name already exists!');
            case 'P2025':
              throw new Error('Unknown roster');
          }
        }
      });
      return team;
    }),

  get: publicProcedure
    .input(z.string())
    .query(({ input: teamName }) => prisma.team.findUniqueOrThrow({ where: { name: teamName } })),

  hirePlayer: publicProcedure
    .input(z.object({
      team: z.string(),
      position: z.string(),
      name: z.string().optional(),
    })
      .transform(async input => ({
        ...input,
        team: await prisma.team.findUniqueOrThrow({
          where: { name: input.team },
          select: { players: true, treasury: true, state: true, name: true },
        }),
        position: await prisma.position.findFirstOrThrow({
          where: {
            name: input.position,
            Roster: { Team: { some: { name: input.team } } },
          },
          include: { skills: true },
        }),
      })))
    .mutation(async({ input: { team, position, name } }) => {
      if (team.state !== TeamState.Draft && team.state !== TeamState.PostGame)
        throw new Error('Team cannot hire new players right now');

      if (team.players.length >= 16)
        throw new Error('Team roster already full');
      if (team.players.filter(p => p.positionId === position.id).length >= position.max)
        throw new Error('Maximum positionals already rostered');
      if (team.treasury < position.cost)
        throw new Error('Cannot afford player');

      return prisma.team.update({
        where: { name: team.name },
        data: {
          treasury: team.treasury - position.cost,
          players: { create: newPlayer(position, name) },
        },
      });
    }),

  hireStaff: publicProcedure
    .input(z.object({
      team: z.string(),
      type: z.enum(['apothecary', 'assistantCoaches', 'cheerleaders', 'rerolls']),
      quantity: z.number()
        .int()
        .gt(0)
        .default(1),
    }).transform(async input => ({
      ...input,
      team: await prisma.team.findUniqueOrThrow({
        where: { name: input.team },
        select: {
          treasury: true,
          state: true,
          name: true,
          apothecary: true,
          assistantCoaches: true,
          cheerleaders: true,
          rerolls: true,
          roster: { select: { specialRules: true, rerollCost: true } },
        },
      }),
    })))
    .mutation(async({ input: { team, type, quantity } }) => {
      if (team.state !== TeamState.Draft && team.state !== TeamState.PostGame)
        throw new Error('Team cannot hire staff right now');
      if (type === 'apothecary' && !team.roster.specialRules.includes('Apothecary Allowed'))
        throw new Error('Apothecary not allowed for this team');

      const baseRerollCost = team.roster.rerollCost;
      const costMap = {
        apothecary: 50_000,
        assistantCoaches: 10_000,
        cheerleaders: 10_000,
        rerolls: team.state === 'Draft' ? baseRerollCost : baseRerollCost * 2,
      };
      const cost = costMap[type] * quantity;
      if (cost > team.treasury)
        throw new Error('Not enough money in treasury');

      const maxMap = {
        apothecary: 1,
        assistantCoaches: 6,
        cheerleaders: 12,
        rerolls: 8,
      };
      if (Number(team[type]) + quantity > maxMap[type])
        throw new Error('Maximum exceeded');

      return prisma.team.update({
        where: { name: team.name },
        data: {
          [type]: type === 'apothecary' ? true : { increment: quantity },
          treasury: { decrement: cost },
        },
      });
    }),

  fireStaff: publicProcedure
    .input(z.object({
      team: z.string(),
      type: z.enum(['apothecary', 'assistantCoaches', 'cheerleaders', 'rerolls']),
      quantity: z.number()
        .int()
        .gt(0)
        .default(1),
    }).transform(async input => ({
      ...input,
      team: await prisma.team.findUniqueOrThrow({
        where: { name: input.team },
        select: {
          treasury: true,
          state: true,
          name: true,
          apothecary: true,
          assistantCoaches: true,
          cheerleaders: true,
          rerolls: true,
          roster: { select: { rerollCost: true } },
        },
      }),
    })))
    .mutation(async({ input: { team, type, quantity } }) => {
      if (team.state !== TeamState.Draft && team.state !== TeamState.PostGame)
        throw new Error('Team cannot fire staff right now');
      if (Number(team[type]) - quantity < 0)
        throw new Error('Not enough staff to fire');

      const costMap = {
        apothecary: 50_000,
        assistantCoaches: 10_000,
        cheerleaders: 10_000,
        rerolls: team.roster.rerollCost,
      };

      return prisma.team.update({
        where: { name: team.name },
        data: {
          [type]: { decrement: quantity },
          treasury: team.state === TeamState.Draft ? { increment: costMap[type] * quantity } : undefined,
        },
      });
    }),

  ready: publicProcedure
    .input(z.string()
      .transform(async name =>
        prisma.team.findUniqueOrThrow({
          where: { name },
          select: { name: true, state: true, treasury: true, _count: { select: { players: true } } },
        })))
    .mutation(async({ input: team }) => {
      if (team.state !== TeamState.Draft && team.state !== TeamState.PostGame)
        throw new Error('Team not in Draft or PostGame state');
      // eslint-disable-next-line no-underscore-dangle
      if (team.state === TeamState.Draft && team._count.players < 11)
        throw new Error('11 players required to draft a team');

      const expensiveMistakesFunctions: Record<string, (g: number) => number> = {
        'Crisis Averted': () => 0,
        'Minor Incident': () => Math.ceil(Math.random() * 3) * 10_000,
        'Major Incident': g => Math.floor((g / 5_000) / 2) * 5_000,
        'Catastrophe': g => g - ((Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6)) * 10_000),
      };
      const expensiveMistakesTable = [
        ['Crisis Averted', 'Crisis Averted', 'Crisis Averted', 'Crisis Averted', 'Crisis Averted', 'Crisis Averted'],
        ['Minor Incident', 'Crisis Averted', 'Crisis Averted', 'Crisis Averted', 'Crisis Averted', 'Crisis Averted'],
        ['Minor Incident', 'Minor Incident', 'Crisis Averted', 'Crisis Averted', 'Crisis Averted', 'Crisis Averted'],
        ['Major Incident', 'Minor Incident', 'Minor Incident', 'Crisis Averted', 'Crisis Averted', 'Crisis Averted'],
        ['Major Incident', 'Major Incident', 'Minor Incident', 'Minor Incident', 'Crisis Averted', 'Crisis Averted'],
        ['Catastrophe', 'Major Incident', 'Major Incident', 'Minor Incident', 'Minor Incident', 'Crisis Averted'],
        ['Catastrophe', 'Catastrophe', 'Major Incident', 'Major Incident', 'Major Incident', 'Major Incident'],
      ];
      const expensiveMistake = team.state === TeamState.Draft
        ? null
        : expensiveMistakesTable[
          Math.min(Math.floor(team.treasury / 100_000), 6)
        ][Math.floor(Math.random() * 6)];
      const expensiveMistakesCost = expensiveMistake !== null
        ? expensiveMistakesFunctions[expensiveMistake](team.treasury)
        : 0;
      return prisma.team.update({
        where: { name: team.name },
        data: { state: 'Ready', treasury: { decrement: expensiveMistakesCost } },
      }).then(() => ({
        expensiveMistake,
        expensiveMistakesCost,
      }));
    }),
});

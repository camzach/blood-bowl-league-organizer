import { Prisma, TeamState } from '@prisma/client';
import { z } from 'zod';
import { publicProcedure, router } from 'server/trpc';
import { newPlayer } from './new-player';

export const teamRouter = router({
  create: publicProcedure
    .input(z.object({ name: z.string().min(1), roster: z.string() }))
    .mutation(async({ input, ctx }) => {
      const { name: teamName, roster } = input;
      const team = await ctx.prisma.team.create({
        data: {
          name: teamName,
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

  hirePlayer: publicProcedure
    .input(z.object({
      team: z.string(),
      position: z.string(),
      number: z.number().min(1).max(16),
      name: z.string().optional(),
    }))
    .mutation(async({ input, ctx }) => {
      if (!ctx.session)
        throw new Error('Not authenticated');
      if (!ctx.session.user.teams.includes(input.team))
        throw new Error('User does not have permission to modify this team');
      const team = await ctx.prisma.team.findUniqueOrThrow({
        where: { name: input.team },
        select: { players: true, treasury: true, state: true, name: true },
      });
      const position = await ctx.prisma.position.findFirstOrThrow({
        where: {
          name: input.position,
          Roster: { Team: { some: { name: input.team } } },
        },
        include: { skills: true },
      });
      if (team.state !== TeamState.Draft && team.state !== TeamState.PostGame)
        throw new Error('Team cannot hire new players right now');

      if (team.players.length >= 16)
        throw new Error('Team roster already full');
      if (team.players.filter(p => p.positionId === position.id).length >= position.max)
        throw new Error('Maximum positionals already rostered');
      if (team.players.some(p => p.number === input.number))
        throw new Error('Player with this number already exists');
      if (team.treasury < position.cost)
        throw new Error('Cannot afford player');

      return ctx.prisma.team.update({
        where: { name: team.name },
        data: {
          treasury: team.treasury - position.cost,
          players: { create: newPlayer(position, input.number, input.name) },
        },
      });
    }),

  hireStaff: publicProcedure
    .input(z.object({
      team: z.string(),
      type: z.enum(['apothecary', 'assistantCoaches', 'cheerleaders', 'rerolls', 'dedicatedFans']),
      quantity: z.number()
        .int()
        .gt(0)
        .default(1),
    }))
    .mutation(async({ input, ctx }) => {
      if (!ctx.session)
        throw new Error('Not authenticated');
      if (!ctx.session.user.teams.includes(input.team))
        throw new Error('User does not have permission to modify this team');
      const team = await ctx.prisma.team.findUniqueOrThrow({
        where: { name: input.team },
        select: {
          treasury: true,
          state: true,
          name: true,
          apothecary: true,
          assistantCoaches: true,
          cheerleaders: true,
          rerolls: true,
          dedicatedFans: true,
          roster: { select: { specialRules: true, rerollCost: true } },
        },
      });
      if (team.state !== TeamState.Draft && team.state !== TeamState.PostGame)
        throw new Error('Team cannot hire staff right now');
      if (input.type === 'apothecary' && !team.roster.specialRules.some(rule => rule.name === 'Apothecary Allowed'))
        throw new Error('Apothecary not allowed for this team');
      if (input.type === 'dedicatedFans' && team.state !== TeamState.Draft)
        throw new Error('Cannot purchase deidcated fans after draft');

      const baseRerollCost = team.roster.rerollCost;
      const costMap = {
        apothecary: 50_000,
        assistantCoaches: 10_000,
        cheerleaders: 10_000,
        rerolls: team.state === 'Draft' ? baseRerollCost : baseRerollCost * 2,
        dedicatedFans: 10_000,
      };
      const cost = costMap[input.type] * input.quantity;
      if (cost > team.treasury)
        throw new Error('Not enough money in treasury');

      const maxMap = {
        apothecary: 1,
        assistantCoaches: 6,
        cheerleaders: 12,
        rerolls: 8,
        dedicatedFans: 7,
      };
      if (Number(team[input.type]) + input.quantity > maxMap[input.type])
        throw new Error('Maximum exceeded');

      return ctx.prisma.team.update({
        where: { name: team.name },
        data: {
          [input.type]: input.type === 'apothecary' ? true : { increment: input.quantity },
          treasury: { decrement: cost },
        },
      });
    }),

  hireJourneyman: publicProcedure
    .input(z.object({ team: z.string(), player: z.string(), number: z.number().min(1).max(16) }))
    .mutation(async({ input, ctx }) => {
      if (!ctx.session)
        throw new Error('Not authenticated');
      if (!ctx.session.user.teams.includes(input.team))
        throw new Error('User does not have permission to modify this team');
      const team = await ctx.prisma.team.findUniqueOrThrow({
        where: { name: input.team },
        select: {
          treasury: true,
          players: { select: { number: true, positionId: true } },
          journeymen: { select: { id: true, position: { select: { id: true, max: true, cost: true } } } },
        },
      });

      if (team.players.length >= 16)
        throw new Error('Team cannor hire any more players');
      const player = team.journeymen.find(p => p.id === input.player);
      if (!player)
        throw new Error('Invalid Player ID');
      if (team.players.filter(p => p.positionId === player.position.id).length >= player.position.max)
        throw new Error('Cannot hire any more players of this position');
      if (team.players.some(p => p.number === input.number))
        throw new Error('Tem already has a player with this number');
      if (player.position.cost > team.treasury)
        throw new Error('Cannot afford this player');

      await ctx.prisma.$transaction([
        ctx.prisma.team.update({
          where: { name: input.team },
          data: {
            journeymen: { disconnect: { id: player.id } },
            players: { connect: { id: player.id } },
          },
        }),
        ctx.prisma.player.update({
          where: { id: player.id },
          data: { number: input.number },
        }),
      ]);
    }),

  fireStaff: publicProcedure
    .input(z.object({
      team: z.string(),
      type: z.enum(['apothecary', 'assistantCoaches', 'cheerleaders', 'rerolls', 'dedicatedFans']),
      quantity: z.number()
        .int()
        .gt(0)
        .default(1),
    }))
    .mutation(async({ input, ctx }) => {
      if (!ctx.session)
        throw new Error('Not authenticated');
      if (!ctx.session.user.teams.includes(input.team))
        throw new Error('User does not have permission to modify this team');
      const team = await ctx.prisma.team.findUniqueOrThrow({
        where: { name: input.team },
        select: {
          treasury: true,
          state: true,
          name: true,
          apothecary: true,
          assistantCoaches: true,
          cheerleaders: true,
          rerolls: true,
          dedicatedFans: true,
          roster: { select: { rerollCost: true } },
        },
      });
      if (team.state !== TeamState.Draft && team.state !== TeamState.PostGame)
        throw new Error('Team cannot fire staff right now');
      if (Number(team[input.type]) - input.quantity < 0)
        throw new Error('Not enough staff to fire');
      if (input.type === 'dedicatedFans' && team.state !== TeamState.Draft)
        throw new Error('Cannot purchase deidcated fans after draft');

      const costMap = {
        apothecary: 50_000,
        assistantCoaches: 10_000,
        cheerleaders: 10_000,
        rerolls: team.roster.rerollCost,
        dedicatedFans: 10_000,
      };

      return ctx.prisma.team.update({
        where: { name: team.name },
        data: {
          [input.type]: input.type === 'apothecary' ? false : { decrement: input.quantity },
          treasury: team.state === TeamState.Draft ? { increment: costMap[input.type] * input.quantity } : undefined,
        },
      });
    }),

  ready: publicProcedure
    .input(z.string())
    .mutation(async({ input, ctx }) => {
      if (!ctx.session)
        throw new Error('Not authenticated');
      if (!ctx.session.user.teams.includes(input))
        throw new Error('User does not have permission to modify this team');
      const team = await ctx.prisma.team.findUniqueOrThrow({
        where: { name: input },
        select: { name: true, state: true, treasury: true, _count: { select: { players: true } } },
      });
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
      return ctx.prisma.team.update({
        where: { name: team.name },
        data: { state: 'Ready', treasury: { decrement: expensiveMistakesCost } },
      }).then(() => ({
        expensiveMistake,
        expensiveMistakesCost,
      }));
    }),
});

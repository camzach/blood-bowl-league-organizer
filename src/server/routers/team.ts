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

      return ctx.prisma.$transaction(async tx => {
        const position = await tx.position.findFirstOrThrow({
          where: {
            name: input.position,
            Roster: { Team: { some: { name: input.team } } },
          },
          include: { skills: true },
        });

        const team = await tx.team.update({
          where: { name: input.team },
          data: {
            treasury: { decrement: position.cost },
            players: { create: newPlayer(position, input.number, input.name) },
          },
          include: { players: { select: { id: true, positionId: true, number: true } } },
        });

        if (team.state !== TeamState.Draft && team.state !== TeamState.PostGame)
          throw new Error('Team cannot hire new players right now');

        if (team.players.length >= 16)
          throw new Error('Team roster already full');
        if (team.players.filter(p => p.positionId === position.id).length >= position.max)
          throw new Error('Maximum positionals already rostered');
        if (team.players.filter(p => p.number === input.number).length > 1)
          throw new Error('Player with this number already exists');
        if (team.treasury < position.cost)
          throw new Error('Cannot afford player');
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
        select: { roster: { select: { specialRules: true, rerollCost: true } }, state: true },
      });

      return ctx.prisma.$transaction(async tx => {
        const baseRerollCost = team.roster.rerollCost;
        const costMap = {
          apothecary: 50_000,
          assistantCoaches: 10_000,
          cheerleaders: 10_000,
          rerolls: team.state === 'Draft' ? baseRerollCost : baseRerollCost * 2,
          dedicatedFans: 10_000,
        };
        const cost = costMap[input.type] * input.quantity;

        const updatedTeam = await tx.team.update({
          where: { name: input.team },
          data: {
            [input.type]: input.type === 'apothecary' ? true : { increment: input.quantity },
            treasury: { decrement: cost },
          },
          include: { roster: { select: { specialRules: true } } },
        });
        if (updatedTeam.state !== TeamState.Draft && updatedTeam.state !== TeamState.PostGame)
          throw new Error('Team cannot hire staff right now');
        if (input.type === 'apothecary' &&
          !updatedTeam.roster.specialRules.some(rule => rule.name === 'Apothecary Allowed')
        )
          throw new Error('Apothecary not allowed for this team');
        if (input.type === 'dedicatedFans' && updatedTeam.state !== TeamState.Draft)
          throw new Error('Cannot purchase deidcated fans after draft');

        if (updatedTeam.treasury < 0)
          throw new Error('Not enough money in treasury');

        const maxMap = {
          apothecary: 1,
          assistantCoaches: 6,
          cheerleaders: 12,
          rerolls: 8,
          dedicatedFans: 7,
        };
        if (Number(updatedTeam[input.type]) + input.quantity > maxMap[input.type])
          throw new Error('Maximum exceeded');

        return updatedTeam;
      });
    }),

  hireExistingPlayer: publicProcedure
    .input(z.object({
      team: z.string(),
      player: z.string(),
      number: z.number().min(1).max(16),
      from: z.enum(['journeymen', 'redrafts']).default('journeymen'),
    }))
    .mutation(async({ input, ctx }) => {
      if (!ctx.session)
        throw new Error('Not authenticated');
      if (!ctx.session.user.teams.includes(input.team))
        throw new Error('User does not have permission to modify this team');

      const hiredPlayerQuery = {
        select: {
          id: true,
          position: { select: { id: true, max: true } },
          teamValue: true,
          seasonsPlayed: true,
        },
      };

      return ctx.prisma.$transaction(async tx => {
        const team = await tx.team.findUniqueOrThrow({
          where: { name: input.team },
          select: {
            journeymen: hiredPlayerQuery,
            redrafts: hiredPlayerQuery,
          },
        });

        const player = team[input.from].find(p => p.id === input.player);
        if (!player)
          throw new Error('Invalid Player ID');

        const cost = player.teamValue + (player.seasonsPlayed * 20_000);

        const updatedTeam =
          await tx.team.update({
            where: { name: input.team },
            data: {
              [input.from]: { disconnect: { id: player.id } },
              players: { connect: { id: player.id } },
              treasury: { decrement: cost },
            },
            include: { players: true },
          });

        if (updatedTeam.players.length > 16)
          throw new Error('Team cannor hire any more players');
        if (updatedTeam.players.filter(p => p.positionId === player.position.id).length > player.position.max)
          throw new Error('Cannot hire any more players of this position');
        if (updatedTeam.players.filter(p => p.number === input.number).length > 1)
          throw new Error('Team already has a player with this number');
        if (updatedTeam.treasury < 0)
          throw new Error('Team cannot afford this player');

        const updatedPlayer = await tx.player.update({
          where: { id: player.id },
          data: { number: input.number },
        });

        return [updatedTeam, updatedPlayer];
      });
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

      return ctx.prisma.$transaction(async tx => {
        const team = await tx.team.findUniqueOrThrow({
          where: { name: input.team },
          select: {
            state: true,
            name: true,
            roster: { select: { rerollCost: true } },
          },
        });

        const costMap = {
          apothecary: 50_000,
          assistantCoaches: 10_000,
          cheerleaders: 10_000,
          rerolls: team.roster.rerollCost,
          dedicatedFans: 10_000,
        };

        const updatedTeam = await tx.team.update({
          where: { name: team.name },
          data: {
            [input.type]: input.type === 'apothecary' ? false : { decrement: input.quantity },
            treasury: team.state === TeamState.Draft ? { increment: costMap[input.type] * input.quantity } : undefined,
          },
        });

        if (updatedTeam.state !== TeamState.Draft && updatedTeam.state !== TeamState.PostGame)
          throw new Error('Team cannot fire staff right now');
        if (Number(updatedTeam[input.type]) < 0)
          throw new Error('Not enough staff to fire');
        if (input.type === 'dedicatedFans' && updatedTeam.state !== TeamState.Draft)
          throw new Error('Cannot purchase deidcated fans after draft');

        return updatedTeam;
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

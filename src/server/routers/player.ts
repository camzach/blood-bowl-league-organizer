import type { Prisma } from '@prisma/client';
import { SkillCategory, TeamState } from '@prisma/client';
import { string, z } from 'zod';
import { publicProcedure, router } from 'server/trpc';

function upperFirst<T extends string>(str: T): Capitalize<T> {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}` as Capitalize<T>;
}

export const playerRouter = router({
  fire: publicProcedure
    .input(z.string())
    .mutation(async({ input, ctx }) => {
      const player = await ctx.prisma.player.findFirstOrThrow({
        where: { id: input },
        select: { playerTeam: { select: { state: true, name: true } }, teamValue: true, id: true },
      });
      if (player.playerTeam === null)
        throw new Error('Player is not on any team');
      if (!ctx.session)
        throw new Error('Not authenticated');
      if (!ctx.session.user.teams.includes(player.playerTeam.name))
        throw new Error('User does not have permission to modify this team');
      if (player.playerTeam.state === TeamState.Draft) {
        return ctx.prisma.team.update({
          where: { name: player.playerTeam.name },
          data: {
            players: { delete: { id: player.id } },
            treasury: { increment: player.teamValue },
          },
        });
      }
      if (player.playerTeam.state === TeamState.PostGame) {
        return ctx.prisma.player.update({
          where: { id: player.id },
          data: { playerTeam: { disconnect: true } },
        });
      }
      throw new Error('Team not in Draft or PostGame state');
    }),

  update: publicProcedure
    .input(z.object({
      player: string(),
      number: z.number().min(1).max(16)
        .optional(),
      name: z.string().optional(),
    }))
    .mutation(async({ input, ctx }) => {
      const player = await ctx.prisma.player.findUniqueOrThrow({
        where: { id: input.player },
        include: { playerTeam: { select: { state: true, name: true } }, skills: true },
      });

      if (player.playerTeam === null)
        throw new Error('Player is not on any team');
      if (!ctx.session)
        throw new Error('Not authenticated');
      if (!ctx.session.user.teams.includes(player.playerTeam.name))
        throw new Error('User does not have permission to modify this team');
      if (!([TeamState.PostGame, TeamState.Draft] as TeamState[]).includes(player.playerTeam.state))
        throw new Error('Team is not modifiable');

      const mutations = [
        ctx.prisma.player.update({
          where: { id: player.id },
          data: { number: input.number, name: input.name },
        }),
      ];
      if (input.number !== undefined) {
        const otherPlayer = await ctx.prisma.player.findFirst({
          where: {
            number: input.number,
            playerTeamName: player.playerTeamName,
          },
        });
        if (otherPlayer) {
          mutations.push(ctx.prisma.player.update({
            where: { id: otherPlayer.id },
            data: { number: player.number },
          }));
        }
      }
      return ctx.prisma.$transaction(mutations);
    }),

  improve: publicProcedure
    .input(z.object({
      player: string(),
      update: z.discriminatedUnion('type', [
        z.object({
          type: z.literal('chosen'),
          subtype: z.literal('primary').or(z.literal('secondary')),
          skill: string(),
        }),
        z.object({
          type: z.literal('random'),
          subtype: z.literal('primary').or(z.literal('secondary')),
          category: z.enum(Object.values(SkillCategory) as [SkillCategory, ...SkillCategory[]]),
        }),
        z.object({
          type: z.literal('characteristic'),
          preferences: z.array(z.enum(['MA', 'AG', 'ST', 'PA', 'AV'])).nonempty(),
          skill: string(),
        }),
      ]),
    }))
    .mutation(async({ input, ctx }) => {
      const { update } = input;
      const player = await ctx.prisma.player.findUniqueOrThrow({
        where: { id: input.player },
        include: { playerTeam: { select: { state: true, name: true } }, skills: true },
      });

      if (player.playerTeam === null)
        throw new Error('Player is not on any team');
      if (!ctx.session)
        throw new Error('Not authenticated');
      if (!ctx.session.user.teams.includes(player.playerTeam.name))
        throw new Error('User does not have permission to modify this team');
      if (player.playerTeam.state !== TeamState.PostGame)
        throw new Error('Team is not in PostGame state');
      if (player.totalImprovements >= 6)
        throw new Error('Cannot improve player any more');

      const sppCostTable = {
        randomPrimary: [3, 4, 6, 8, 10, 15],
        chosenPrimary: [6, 8, 12, 16, 20, 30],
        randomSecondary: [6, 8, 12, 16, 20, 30],
        chosenSecondary: [12, 14, 18, 22, 26, 40],
        characteristic: [18, 20, 24, 28, 32, 50],
      };

      const sppCost = update.type === 'characteristic'
        ? sppCostTable[update.type][player.totalImprovements]
        : sppCostTable[`${update.type}${upperFirst(update.subtype)}`][player.totalImprovements];
      if (sppCost > player.starPlayerPoints)
        throw new Error('Player does not have enough SPP');

      const skill = 'skill' in update
        ? await ctx.prisma.skill.findUniqueOrThrow({ where: { name: update.skill } })
        : null;

      if (skill !== null) {
        const category = 'subtype' in update ? update.subtype : 'secondary';
        if (!player[category].includes(skill.category))
          throw new Error('Skill not from a valid category');
        if (player.skills.some(s => s.name === skill.name))
          throw new Error('Player already has this skill');
      }

      const tvCostTable = {
        randomPrimary: 10_000,
        chosenPrimary: 20_000,
        randomSecondary: 20_000,
        chosenSecondary: 40_000,
        AV: 10_000,
        MA: 20_000,
        PA: 20_000,
        AG: 40_000,
        ST: 80_000,
      };

      const playerUpdate: Prisma.PlayerUpdateInput = {
        totalImprovements: { increment: 1 },
        starPlayerPoints: { decrement: sppCost },
      };
      if (update.type === 'chosen' && skill !== null) {
        playerUpdate.skills = { connect: { name: skill.name } };
        playerUpdate.teamValue = { increment: tvCostTable[`${update.type}${upperFirst(update.subtype)}`] };
      } else if (update.type === 'random') {
        if (!player[update.subtype].includes(update.category))
          throw new Error('Invalid skill category');
        const skills = await ctx.prisma.skill.findMany({
          where: {
            category: update.category,
            name: { notIn: player.skills.map(s => s.name) },
          },
        });
        const rolledSkill = skills[Math.floor(Math.random() * skills.length)];
        playerUpdate.skills = { connect: { name: rolledSkill.name } };
        playerUpdate.teamValue = { increment: tvCostTable[`${update.type}${upperFirst(update.subtype)}`] };
      } else if (update.type === 'characteristic' && skill !== null) {
        const rollTable: Array<Array<'MA' | 'AV' | 'PA' | 'AG' | 'ST'>> = [
          ['MA', 'AV'],
          ['MA', 'AV'],
          ['MA', 'AV'],
          ['MA', 'AV'],
          ['MA', 'AV'],
          ['MA', 'AV'],
          ['MA', 'AV'],
          ['MA', 'AV', 'PA'],
          ['MA', 'AV', 'PA'],
          ['MA', 'AV', 'PA'],
          ['MA', 'AV', 'PA'],
          ['MA', 'AV', 'PA'],
          ['MA', 'AV', 'PA'],
          ['PA', 'AG'],
          ['AG', 'ST'],
          ['MA', 'AV', 'PA', 'AG', 'ST'],
        ];
        const statMinMax = {
          MA: [1, 9],
          ST: [1, 8],
          AG: [1, 6],
          PA: [1, 6],
          AV: [3, 11],
        };

        const availableOptions = rollTable[Math.floor(Math.random() * 16)];
        const choice = update.preferences.find(pref => availableOptions.includes(pref)) ?? 'chosenSecondary';
        playerUpdate.teamValue = { increment: tvCostTable[choice] };

        if (choice === 'MA' || choice === 'AV' || choice === 'ST') {
          if (player[choice] >= statMinMax[choice][1] || player[`${choice}Improvements`] >= 2)
            throw new Error('Characteristc can not be improved any further');
          playerUpdate[choice] = { increment: 1 };
          playerUpdate[`${choice}Improvements`] = { increment: 1 };
        } else if (choice === 'PA' || choice === 'AG') {
          if ((player[choice] ?? 7) <= statMinMax[choice][0] || player[`${choice}Improvements`] >= 2)
            throw new Error('Characteristc can not be improved any further');
          playerUpdate[choice] = player[choice] === null ? 6 : { decrement: 1 };
          playerUpdate[`${choice}Improvements`] = { increment: 1 };
        } else {
          playerUpdate.skills = { connect: { name: skill.name } };
        }
      }

      return ctx.prisma.player.update({ where: { id: player.id }, data: playerUpdate });
    }),
});

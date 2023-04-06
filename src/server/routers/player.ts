import type { Prisma } from '@prisma/client/edge';
import { SkillCategory, TeamState } from '@prisma/client/edge';
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
      name: z.string().min(1).optional(),
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

      const playerUpdate: Prisma.PlayerUpdateInput = { totalImprovements: { increment: 1 } };
      let characteristicChoice:
      (typeof update & { type: 'characteristic' })['preferences'][number] |
      'chosenSecondary' |
      null = null;
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

        const availableOptions = rollTable[Math.floor(Math.random() * 16)];
        characteristicChoice = update.preferences.find(pref => availableOptions.includes(pref)) ?? 'chosenSecondary';

        playerUpdate.teamValue = { increment: tvCostTable[characteristicChoice] };

        if (characteristicChoice !== 'chosenSecondary') {
          if (characteristicChoice === 'MA' || characteristicChoice === 'AV' || characteristicChoice === 'ST')
            playerUpdate[characteristicChoice] = { increment: 1 };
          else
            playerUpdate[characteristicChoice] = player[characteristicChoice] === null ? 6 : { decrement: 1 };

          playerUpdate[`${characteristicChoice}Improvements`] = { increment: 1 };
        } else {
          playerUpdate.skills = { connect: { name: skill.name } };
        }
      }

      return ctx.prisma.$transaction(async tx => {
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
        playerUpdate.starPlayerPoints = { decrement: sppCost };
        const updatedPlayer = await tx.player.update({ where: { id: player.id }, data: playerUpdate });

        if (updatedPlayer.totalImprovements > 6)
          throw new Error('Player cannot be improved further');
        if (updatedPlayer.starPlayerPoints < 0)
          throw new Error('Player does not have enough SPP');

        const statMinMax = {
          MA: [1, 9],
          ST: [1, 8],
          AG: [1, 6],
          PA: [1, 6],
          AV: [3, 11],
        };
        const stats = Object.keys(statMinMax) as Array<keyof typeof statMinMax>;
        for (const stat of stats) {
          if (
            (updatedPlayer[stat] ?? 1) < statMinMax[stat][0] ||
            (updatedPlayer[stat] ?? 1) > statMinMax[stat][1] ||
            updatedPlayer[`${stat}Improvements`] > 2
          )
            throw new Error('Stat cannot be improved further');
        }
      });
    }),
});

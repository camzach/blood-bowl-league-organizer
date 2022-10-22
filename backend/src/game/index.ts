import type { Prisma, PrismaPromise } from '@prisma/client';
import { GameState } from '@prisma/client';
import { publicProcedure, router } from '../trpc';
import { newPlayer } from '../new-player';
import { prisma } from '../prisma-singleton';
import { z } from 'zod';
import { calculateInducementCosts } from './calculate-inducement-costs';

export const gameRouter = router({
  start: publicProcedure
    .input(z.string()
      .transform(id => {
        const startGameTeamFields = {
          select: {
            players: { where: { missNextGame: false } },
            roster: { select: { positions: { where: { max: { gte: 12 } }, select: { name: true } } } },
            dedicatedFans: true,
            name: true,
          },
        } as const;
        return prisma.game.findUniqueOrThrow({
          where: { id },
          select: {
            id: true,
            home: startGameTeamFields,
            away: startGameTeamFields,
          },
        });
      }))
    .query(async({ input: game }) => {
      const weatherTable = [
        'Sweltering Heat',
        'Very Sunny',
        ...Array.from(Array(7), () => 'Perfect Conditions'),
        'Pouring Rain',
        'Blizzard',
      ];

      const fanFactorHome = game.home.dedicatedFans + Math.ceil(Math.random() * 6);
      const fanFactorAway = game.away.dedicatedFans + Math.ceil(Math.random() * 6);
      const weatherRoll = Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6);
      const weatherResult = weatherTable[weatherRoll];

      const homeJourneymen = {
        count: Math.max(0, 11 - game.home.players.length),
        players: game.home.roster.positions.map(({ name }) => name),
      };
      const awayJourneymen = {
        count: Math.max(0, 11 - game.away.players.length),
        players: game.away.roster.positions.map(({ name }) => name),
      };

      const result = {
        fanFactorHome,
        fanFactorAway,
        weatherResult,
        homeJourneymen,
        awayJourneymen,
      };

      const teamUpdates = prisma.team.updateMany({
        where: { name: { in: [game.home.name, game.away.name] } },
        data: { state: 'Playing' },
      });
      const gameUpdate = prisma.game.update({ where: { id: game.id }, data: { state: 'Journeymen' } });
      return prisma.$transaction([teamUpdates, gameUpdate]).then(() => result);
    }),

  selectJourneymen: publicProcedure
    .input(z.object({ home: z.string().optional(), away: z.string().optional(), game: z.string() })
      .transform(async input => {
        const teamFields = {
          name: true,
          apothecary: true,
          assistantCoaches: true,
          cheerleaders: true,
          rerolls: true,
          roster: { select: { name: true, rerollCost: true } },
          players: {
            where: { missNextGame: false },
            select: { teamValue: true },
          },
        } as const;
        return {
          ...input,
          game: await prisma.game.findUniqueOrThrow({
            where: { id: input.game },
            select: {
              id: true,
              state: true,
              home: { select: teamFields },
              away: { select: teamFields },
            },
          }),
        };
      })
      .transform(async input => {
        const makeQuery = (name: string, rosterName: string) => ({
          where: {
            name,
            rosterName,
            max: { gte: 12 },
          },
          include: { skills: true },
        } as const);
        return {
          ...input,
          homeChoice: input.home !== undefined
            ? await prisma.position.findFirstOrThrow(makeQuery(input.home, input.game.home.roster.name))
            : undefined,
          awayChoice: input.away !== undefined
            ? await prisma.position.findFirstOrThrow(makeQuery(input.away, input.game.away.roster.name))
            : undefined,
        };
      }))
    .mutation(async({ input: { game, homeChoice, awayChoice } }) => {
      if (game.state !== GameState.Journeymen)
        throw new Error('Game not awaiting journeymen choice');

      const homePlayers = game.home.players.length;
      const awayPlayers = game.away.players.length;
      if (homePlayers < 11 && !homeChoice)
        throw new Error('Missing journeymen selection for home team');
      else if (homePlayers >= 11 && homeChoice)
        throw new Error('Home team will not take any journeymen');
      if (awayPlayers < 11 && !awayChoice)
        throw new Error('Missing journeymen selection for away team');
      else if (awayPlayers >= 11 && awayChoice)
        throw new Error('Away team will not take any journeymen');

      let homeTV =
        game.home.players.reduce((sum, player) => sum + player.teamValue, 0) +
        (Number(game.home.apothecary) * 50_000) +
        ((game.home.assistantCoaches + game.home.cheerleaders) * 10_000) +
        (game.home.rerolls * game.home.roster.rerollCost);
      let awayTV =
        game.home.players.reduce((sum, player) => sum + player.teamValue, 0) +
        (Number(game.home.apothecary) * 50_000) +
        ((game.home.assistantCoaches + game.home.cheerleaders) * 10_000) +
        (game.home.rerolls * game.home.roster.rerollCost);

      const promises: Array<PrismaPromise<unknown>> = [];
      if (homeChoice) {
        homeTV += homeChoice.cost * (11 - homePlayers);
        promises.push(prisma.team.update({
          where: { name: game.home.name },
          data: { journeymen: { create: Array(11 - homePlayers).fill(newPlayer(homeChoice)) } },
        }));
      }
      if (awayChoice) {
        awayTV += awayChoice.cost * (11 - homePlayers);
        promises.push(prisma.team.update({
          where: { name: game.home.name },
          data: { journeymen: { create: Array(11 - homePlayers).fill(newPlayer(awayChoice)) } },
        }));
      }

      const pettyCashHome = Math.max(0, awayTV - homeTV);
      const pettyCashAway = Math.max(0, homeTV - awayTV);
      promises.push(prisma.game.update({
        where: { id: game.id },
        data: {
          state: 'Inducements',
          pettyCashHome,
          pettyCashAway,
        },
      }));
      return prisma.$transaction(promises).then(() => ({
        pettyCashHome,
        pettyCashAway,
      }));
    }),

  purchaseInducements: publicProcedure
    .input(input => {
      const choices = z.array(z.object({
        name: z.string(),
        option: z.string().optional(),
        quantity: z.number()
          .int()
          .gt(0)
          .default(1),
      }));
      const teamFields = {
        name: true,
        treasury: true,
        roster: { select: { specialRules: true } },
        players: { where: { missNextGame: false }, select: {} },
      } as const;
      return z.object({
        game: z.string(),
        home: choices,
        away: choices,
      })
        .transform(async i => ({
          ...i,
          game: await prisma.game.findUniqueOrThrow({
            where: { id: i.game },
            select: {
              id: true,
              state: true,
              pettyCashHome: true,
              pettyCashAway: true,
              home: { select: teamFields },
              away: { select: teamFields },
            },
          }),
        }))
        .parse(input);
    })
    .mutation(async({ input: { game, home, away } }) => {
      if (game.state !== GameState.Inducements)
        throw new Error('Game not awaiting inducements');

      let homeInducementCost = 0;
      let awayInducementCost = 0;

      homeInducementCost =
        await calculateInducementCosts(home, game.home.roster.specialRules, game.home.players.length);
      awayInducementCost =
        await calculateInducementCosts(away, game.away.roster.specialRules, game.away.players.length);

      const treasuryCostHome = Math.max(0, homeInducementCost - game.pettyCashHome);
      const treasuryCostAway = Math.max(0, awayInducementCost - game.pettyCashAway);
      if (treasuryCostHome > game.home.treasury || treasuryCostAway > game.away.treasury)
        throw new Error('Inducements are too expensive');

      const homeUpdate = prisma.team.update({
        where: { name: game.home.name },
        data: { treasury: { decrement: treasuryCostHome } },
      });
      const awayUpdate = prisma.team.update({
        where: { name: game.away.name },
        data: { treasury: { decrement: treasuryCostAway } },
      });
      const gameStateUpdate = prisma.game.update({ where: { id: game.id }, data: { state: 'InProgress' } });
      await prisma.$transaction([homeUpdate, awayUpdate, gameStateUpdate]).then(() => ({
        treasuryCostHome,
        treasuryCostAway,
      }));
    }),

  end: publicProcedure
    .input(z.object({
      game: z.string(),
      injuries: z.array(z.object({
        playerId: z.string(),
        injury: z.enum(['MNG', 'NI', 'MA', 'AG', 'PA', 'ST', 'AV', 'DEAD']),
      })),
      starPlayerPoints: z.map(z.string(), z.object({
        touchdowns: z.number().int().default(0),
        casualties: z.number().int().default(0),
        deflections: z.number().int().default(0),
        interceptions: z.number().int().default(0),
        completions: z.number().int().default(0),
        otherSPP: z.number().int().default(0),
      })),
      touchdowns: z.tuple([z.number().int(), z.number().int()]),
      casualties: z.tuple([z.number().int(), z.number().int()]),
    })
      .transform(async i => {
        const teamFields = { players: true, journeymen: true };
        return {
          ...i,
          game: await prisma.game.findUniqueOrThrow({
            where: { id: i.game },
            select: {
              id: true,
              state: true,
              home: { select: teamFields },
              away: { select: teamFields },
            },
          }),
        };
      }))
    .mutation(async({ input }) => {
      const { game } = input;
      const statMinMax = {
        MA: [1, 9],
        ST: [1, 8],
        AG: [1, 6],
        PA: [1, 6],
        AV: [3, 11],
      };

      if (game.state !== GameState.InProgress)
        throw new Error('Game not in progress');

      const players = [...game.home.players, ...game.home.journeymen, ...game.away.players, ...game.away.journeymen];
      let mvpChoicesHome = [...game.home.players.filter(p => !p.missNextGame), ...game.home.journeymen];
      let mvpChoicesAway = [...game.away.players.filter(p => !p.missNextGame), ...game.away.journeymen];

      const updateMap: Record<string, Prisma.PlayerUpdateArgs> =
        Object.fromEntries(players.map(({ id }) => [id, { where: { id }, data: { missNextGame: false } }]));
      for (const injury of input.injuries) {
        const player = players.find(p => p.id === injury.playerId);
        if (!player)
          throw new Error('Player not found');

        const mappedUpdate = updateMap[injury.playerId].data;
        mappedUpdate.missNextGame = true;
        if (injury.injury === 'MA' || injury.injury === 'ST' || injury.injury === 'AV') {
          if (player[injury.injury] - 1 < statMinMax[injury.injury][0])
            throw new Error('Invalid injury, stat cannot be reduced any more');
          mappedUpdate[injury.injury] = { decrement: 1 };
        }
        if (injury.injury === 'PA' || injury.injury === 'AG') {
          if ((player[injury.injury] ?? 0) + 1 > statMinMax[injury.injury][1])
            throw new Error('Invalid injury, stat cannot be increased any more');
          mappedUpdate[injury.injury] = { increment: 1 };
        }
        if (injury.injury === 'NI')
          mappedUpdate.nigglingInjuries = { increment: 1 };
        if (injury.injury === 'DEAD') {
          mappedUpdate.playerTeam = { disconnect: true };
          mappedUpdate.journeymanTeam = { disconnect: true };
          mappedUpdate.dead = true;
          mvpChoicesAway = mvpChoicesAway.filter(p => p.id !== player.id);
          mvpChoicesHome = mvpChoicesHome.filter(p => p.id !== player.id);
        }
      }

      function incrementUpdateField(
        updateData: Prisma.IntFieldUpdateOperationsInput | number | undefined,
        amount: number
      ): Prisma.IntFieldUpdateOperationsInput | number {
        if (updateData === undefined)
          return { increment: amount };
        if (typeof updateData === 'number')
          return updateData + amount;
        if (updateData.increment === undefined)
          return { increment: amount };
        return { increment: updateData.increment + amount };
      }

      for (const [id, points] of input.starPlayerPoints.entries()) {
        const player = players.find(p => p.id === id);
        if (!player)
          throw new Error('Player not found');

        updateMap[id] ??= { where: { id }, data: {} };
        const mappedUpdate = updateMap[id].data;

        mappedUpdate.casualties = incrementUpdateField(mappedUpdate.casualties, points.casualties);
        mappedUpdate.deflections = incrementUpdateField(mappedUpdate.deflections, points.deflections);
        mappedUpdate.interceptions = incrementUpdateField(mappedUpdate.interceptions, points.interceptions);
        mappedUpdate.touchdowns = incrementUpdateField(mappedUpdate.touchdowns, points.touchdowns);
        mappedUpdate.completions = incrementUpdateField(mappedUpdate.completions, points.completions);
        mappedUpdate.starPlayerPoints = incrementUpdateField(
          mappedUpdate.starPlayerPoints,
          (points.completions) +
          (points.deflections) +
          (2 * (points.casualties)) +
          (2 * (points.interceptions)) +
          (3 * (points.touchdowns)) +
          (points.otherSPP)
        );
      }

      const mvpHomeUpdate = updateMap[
        mvpChoicesHome[Math.floor(Math.random() * mvpChoicesHome.length)].id
      ].data;
      mvpHomeUpdate.MVPs = { increment: 1 };
      mvpHomeUpdate.starPlayerPoints = incrementUpdateField(mvpHomeUpdate.starPlayerPoints, 4);

      const mvpAwayUpdate = updateMap[
        mvpChoicesAway[Math.floor(Math.random() * mvpChoicesAway.length)].id
      ].data;
      mvpAwayUpdate.MVPs = { increment: 1 };
      mvpAwayUpdate.starPlayerPoints = incrementUpdateField(mvpAwayUpdate.starPlayerPoints, 4);

      return prisma.$transaction([
        ...Object.values(updateMap).map(update => prisma.player.update(update)),
        prisma.game.update({
          where: { id: game.id },
          data: {
            tdHome: input.touchdowns[0],
            tdAway: input.touchdowns[1],
            casHome: input.casualties[0],
            casAway: input.casualties[1],
            state: 'Complete',
            home: { update: { state: 'PostGame' } },
            away: { update: { state: 'PostGame' } },
          },
        }),
      ]).then(() => updateMap);
    }),
});
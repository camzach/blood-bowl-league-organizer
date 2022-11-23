import type { Prisma, PrismaPromise } from '@prisma/client';
import { GameState, TeamState } from '@prisma/client';
import { publicProcedure, router } from 'server/trpc';
import { newPlayer } from '../new-player';
import { z } from 'zod';
import { calculateInducementCosts } from './calculate-inducement-costs';

export const gameRouter = router({
  start: publicProcedure
    .input(z.string())
    .mutation(async({ input: id, ctx }) => {
      const startGameTeamFields = {
        select: {
          players: { where: { missNextGame: false } },
          roster: { select: { positions: { where: { max: { gte: 12 } }, select: { name: true } } } },
          dedicatedFans: true,
          name: true,
          state: true,
        },
      } as const;
      const game = await ctx.prisma.game.findUniqueOrThrow({
        where: { id },
        select: {
          id: true,
          state: true,
          home: startGameTeamFields,
          away: startGameTeamFields,
        },
      });

      if (game.home.state !== TeamState.Ready || game.away.state !== TeamState.Ready)
        throw new Error('Teams are not ready to start a game');

      if (game.state !== GameState.Scheduled)
        throw new Error('Game has already been started');

      const weatherTable = [
        'Sweltering Heat',
        'Very Sunny',
        ...Array.from(Array(7), () => 'Perfect Conditions'),
        'Pouring Rain',
        'Blizzard',
      ];

      const fairweatherFansHome = Math.ceil(Math.random() * 6);
      const fanFactorHome = game.home.dedicatedFans + fairweatherFansHome;
      const fairweatherFansAway = Math.ceil(Math.random() * 6);
      const fanFactorAway = game.away.dedicatedFans + fairweatherFansAway;
      const weatherRoll = [Math.floor(Math.random() * 6), Math.floor(Math.random() * 6)];
      const weatherResult = weatherTable[weatherRoll[0] + weatherRoll[1]];

      const homeJourneymen = {
        count: Math.max(0, 11 - game.home.players.length),
        players: game.home.roster.positions.map(pos => pos.name),
      };
      const awayJourneymen = {
        count: Math.max(0, 11 - game.away.players.length),
        players: game.away.roster.positions.map(pos => pos.name),
      };

      const result = {
        fairweatherFansHome,
        fanFactorHome,
        fairweatherFansAway,
        fanFactorAway,
        weatherRoll,
        weatherResult,
        homeJourneymen,
        awayJourneymen,
      };

      const teamUpdates = ctx.prisma.team.updateMany({
        where: { name: { in: [game.home.name, game.away.name] } },
        data: { state: TeamState.Playing },
      });
      const gameUpdate = ctx.prisma.game.update({
        where: { id: game.id },
        data: {
          state: GameState.Journeymen,
          journeymenHome: homeJourneymen.count,
          journeymenAway: awayJourneymen.count,
        },
      });
      return ctx.prisma.$transaction([teamUpdates, gameUpdate]).then(() => result);
    }),

  selectJourneymen: publicProcedure
    .input(z.object({ home: z.string().optional(), away: z.string().optional(), game: z.string() }))
    .mutation(async({ input, ctx }) => {
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
      const game = await ctx.prisma.game.findUniqueOrThrow({
        where: { id: input.game },
        select: {
          id: true,
          state: true,
          home: { select: teamFields },
          away: { select: teamFields },
        },
      });
      const makePositionQuery = (positionName: string, rosterName: string) => ({
        where: {
          name: positionName,
          rosterName,
          max: { gte: 12 },
        },
        include: { skills: true },
      } as const);
      const homeChoice = input.home !== undefined
        ? await ctx.prisma.position.findFirstOrThrow(makePositionQuery(input.home, game.home.roster.name))
        : undefined;
      const awayChoice = input.away !== undefined
        ? await ctx.prisma.position.findFirstOrThrow(makePositionQuery(input.away, game.away.roster.name))
        : undefined;

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
        promises.push(ctx.prisma.team.update({
          where: { name: game.home.name },
          data: { journeymen: { create: Array(11 - homePlayers).fill(newPlayer(homeChoice, 0)) } },
        }));
      }
      if (awayChoice) {
        awayTV += awayChoice.cost * (11 - awayPlayers);
        promises.push(ctx.prisma.team.update({
          where: { name: game.away.name },
          data: { journeymen: { create: Array(11 - awayPlayers).fill(newPlayer(awayChoice, 0)) } },
        }));
      }

      const pettyCashHome = Math.max(0, awayTV - homeTV);
      const pettyCashAway = Math.max(0, homeTV - awayTV);
      promises.push(ctx.prisma.game.update({
        where: { id: game.id },
        data: {
          state: GameState.Inducements,
          pettyCashHome,
          pettyCashAway,
        },
      }));
      return ctx.prisma.$transaction(promises).then(() => ({
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
      return z.object({
        game: z.string(),
        home: choices,
        away: choices,
      })
        .parse(input);
    })
    .mutation(async({ input, ctx }) => {
      const teamFields = {
        name: true,
        treasury: true,
        roster: { select: { specialRules: true } },
        players: { where: { missNextGame: false } },
      } as const;
      const game = await ctx.prisma.game.findUniqueOrThrow({
        where: { id: input.game },
        select: {
          id: true,
          state: true,
          pettyCashHome: true,
          pettyCashAway: true,
          home: { select: teamFields },
          away: { select: teamFields },
        },
      });

      if (game.state !== GameState.Inducements)
        throw new Error('Game not awaiting inducements');

      const [homeInducementCost, awayInducementCost] = await Promise.all((['home', 'away'] as const).map(async t =>
        calculateInducementCosts(
          input[t],
          game[t].roster.specialRules.map(r => r.name),
          game[t].players.length,
          ctx.prisma
        )));

      const { pettyCashHome, pettyCashAway } = game;
      const treasuryCostHome = Math.max(0, homeInducementCost - pettyCashHome);
      const treasuryCostAway = Math.max(0, awayInducementCost - pettyCashAway);
      if (treasuryCostHome > game.home.treasury || treasuryCostAway > game.away.treasury)
        throw new Error('Inducements are too expensive');

      const homeUpdate = ctx.prisma.team.update({
        where: { name: game.home.name },
        data: { treasury: { decrement: treasuryCostHome } },
      });
      const awayUpdate = ctx.prisma.team.update({
        where: { name: game.away.name },
        data: { treasury: { decrement: treasuryCostAway } },
      });
      const gameStateUpdate = ctx.prisma.game.update({ where: { id: game.id }, data: { state: GameState.InProgress } });
      await ctx.prisma.$transaction([homeUpdate, awayUpdate, gameStateUpdate]).then(() => ({
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
    }))
    .mutation(async({ input, ctx }) => {
      const teamFields = { players: true, journeymen: true };
      const game = await ctx.prisma.game.findUniqueOrThrow({
        where: { id: input.game },
        select: {
          id: true,
          state: true,
          home: { select: teamFields },
          away: { select: teamFields },
        },
      });
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

      return ctx.prisma.$transaction([
        ...Object.values(updateMap).map(update => ctx.prisma.player.update(update)),
        ctx.prisma.game.update({
          where: { id: game.id },
          data: {
            state: GameState.Complete,
            touchdownsHome: input.touchdowns[0],
            touchdownsAway: input.touchdowns[1],
            casualtiesHome: input.casualties[0],
            casualtiesAway: input.casualties[1],
            home: { update: { state: TeamState.PostGame } },
            away: { update: { state: TeamState.PostGame } },
          },
        }),
      ]).then(() => updateMap);
    }),
});

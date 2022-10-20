import type { Inducement, InducementOption, Prisma, PrismaPromise, Team } from '@prisma/client';
import { Router as expressRouter } from 'express';
import { newPlayer } from './new-player';
import { prisma } from './prisma-singleton';

export const router = expressRouter();

// Start game
const weatherTable = [
  'Sweltering Heat',
  'Very Sunny',
  ...Array.from(Array(7), () => 'Perfect Conditions'),
  'Pouring Rain',
  'Blizzard',
];
const startGameTeamFields = {
  include: {
    players: true,
    roster: { include: { positions: { select: { name: true, max: true } } } },
  },
} as const;
type StartGameResponseType = {
  fanFactorHome: number;
  fanFactorAway: number;
  weatherResult: string;
  journeymenChoices?: {
    home?: string[];
    away?: string[];
  };
};
router.post('/schedule/game/:gameId/start', (req, res, next) => {
  void (async(): Promise<void> => {
    const game = await prisma.game.findUnique({
      where: { id: req.params.gameId },
      include: {
        home: startGameTeamFields,
        away: startGameTeamFields,
      },
    });
    if (!game) {
      res.status(400).send('Game not found');
      return;
    }
    if (!(game.home.state === 'Ready') || !(game.away.state === 'Ready')) {
      res.status(400).send('Teams not ready');
      return;
    }
    const fanFactorHome = game.home.dedicatedFans + Math.ceil(Math.random() * 6);
    const fanFactorAway = game.away.dedicatedFans + Math.ceil(Math.random() * 6);
    const weatherRoll = Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6);
    const weatherResult = weatherTable[weatherRoll];

    const homeJourneymen = Math.max(0, 11 - game.home.players.filter(p => !p.missNextGame).length);
    const awayJourneymen = Math.max(0, 11 - game.away.players.filter(p => !p.missNextGame).length);

    const result: StartGameResponseType = {
      fanFactorHome,
      fanFactorAway,
      weatherResult,
    };

    if (homeJourneymen) {
      result.journeymenChoices ??= {};
      result.journeymenChoices.home = game.home.roster.positions.filter(p => p.max >= 12).map(p => p.name);
    }
    if (awayJourneymen) {
      result.journeymenChoices ??= {};
      result.journeymenChoices.away = game.away.roster.positions.filter(p => p.max >= 12).map(p => p.name);
    }

    const teamUpdates = prisma.team.updateMany({
      where: { name: { in: [game.home.name, game.away.name] } },
      data: { state: 'Playing' },
    });
    const gameUpdate = prisma.game.update({ where: { id: req.params.gameId }, data: { state: 'Journeymen' } });
    await prisma.$transaction([teamUpdates, gameUpdate]);

    res.send(result);
  })().catch(next);
});

// Take on Journeymen
type SelectJourneymenBodyType = {
  home?: string;
  away?: string;
};
router.post('/schedule/game/:gameId/selectJourneymen', (req, res, next) => {
  void (async(): Promise<void> => {
    const body = req.body as SelectJourneymenBodyType;
    const game = await prisma.game.findUnique({
      where: { id: req.params.gameId },
      include: {
        home: startGameTeamFields,
        away: startGameTeamFields,
      },
    });
    if (!game) {
      res.status(400).send('Game not found');
      return;
    }
    if (game.state !== 'Journeymen') {
      res.status(400).send('Game not awaiting journeymen choice');
      return;
    }
    const homePlayers = game.home.players.filter(p => !p.missNextGame).length;
    const awayPlayers = game.away.players.filter(p => !p.missNextGame).length;
    if (homePlayers < 11 && !('home' in body)) {
      res.status(400).send('Missing journeymen selection for home team');
      return;
    }
    if (awayPlayers < 11 && !('away' in body)) {
      res.status(400).send('Missing journeymen selection for away team');
      return;
    }
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
    if (homePlayers < 11 && 'home' in body) {
      const position = await prisma.position.findFirst({
        where: {
          name: body.home,
          max: { in: [12, 16] },
          rosterName: game.home.rosterName,
        },
        include: { skills: true },
      });
      if (!position) {
        res.status(400).send('Invalid position for home team');
        return;
      }
      homeTV += position.cost * (11 - homePlayers);
      promises.push(prisma.team.update({
        where: { name: game.home.name },
        data: { journeymen: { create: Array(11 - homePlayers).fill(newPlayer(position)) } },
      }));
    }
    if (awayPlayers < 11 && 'away' in body) {
      const position = await prisma.position.findFirst({
        where: {
          name: body.away,
          max: { in: [12, 16] },
          rosterName: game.away.rosterName,
        },
        include: { skills: true },
      });
      if (!position) {
        res.status(400).send('Invalid position for away team');
        return;
      }
      awayTV += position.cost * (11 - awayPlayers);
      promises.push(prisma.team.update({
        where: { name: game.away.name },
        data: { journeymen: { create: Array(11 - awayPlayers).fill(newPlayer(position)) } },
      }));
    }
    const pettyCashHome = Math.max(0, awayTV - homeTV);
    const pettyCashAway = Math.max(0, homeTV - awayTV);
    promises.push(prisma.game.update({
      where: { id: req.params.gameId },
      data: {
        state: 'Inducements',
        pettyCashHome,
        pettyCashAway,
      },
    }));
    await prisma.$transaction(promises);

    res.send({
      pettyCashHome,
      pettyCashAway,
    });
  })().catch(next);
});

// Purchase Inducements
type PurchaseInducementsBodyType = {
  home?: Array<{ name: string; option?: string; quantity?: number }>;
  away?: Array<{ name: string; option?: string; quantity?: number }>;
};
const twoForOnePairs = [['Grak', 'Crumbleberry'], ['Lucian Swift', 'Valen Swift']];
function getInducementPrice(inducement: Inducement | InducementOption, specialRules: string[]): number | null {
  if (inducement.specialPriceRule !== null && specialRules.includes(inducement.specialPriceRule))
    return inducement.specialPrice as number;
  return inducement.price;
}
class InducementError extends Error { }
async function calculateInducementCosts(
  selections: NonNullable<PurchaseInducementsBodyType['home' | 'away']>,
  team: Team & { roster: { specialRules: string[] }; players: Array<{ _count: Prisma.PlayerCountOutputType }> }
): Promise<number> {
  const starPlayerNames = selections.filter(ind => ind.name === 'Star Player').map(p => p.option as string);
  if (starPlayerNames.length > 2)
    throw new InducementError('Only 2 star players permitted');
  if (starPlayerNames.length + team.players.length > 16)
    throw new InducementError('Star players take the team above 16 players');

  const starPlayers = await prisma.starPlayer.findMany({ where: { name: { in: starPlayerNames } } });
  if (starPlayers.length !== starPlayerNames.length)
    throw new InducementError('Star player not recognized');

  let starPlayerCost = 0;
  for (const player of starPlayers) {
    if (player.doesntPlayFor.some(rule => team.roster.specialRules.includes(rule)))
      throw new InducementError('Invalid Star Player selected');

    if (player.playsFor.length > 0 && !player.playsFor.some(rule => team.roster.specialRules.includes(rule)))
      throw new InducementError('Invalid Star Player selected');

    starPlayerCost += player.hiringFee;
  }
  // Two for One check
  for (const [playerA, playerB] of twoForOnePairs) {
    if (starPlayers.map(p => p.name).includes(playerA) !== starPlayers.map(p => p.name).includes(playerB))
      throw new InducementError(`${playerA} and ${playerB} must be hired together`);
  }

  const nonStarInducements = selections.filter(ind => ind.name !== 'Star Player');
  const chosenInducements = await prisma.inducement
    .findMany({
      where: { name: { in: nonStarInducements.map(ind => ind.name) } },
      include: {
        options: {
          where: {
            name: {
              in: nonStarInducements
                .map(ind => ind.option)
                .filter((opt): opt is string => opt !== undefined),
            },
          },
        },
      },
    });

  let inducementCost = 0;
  const inducementCounts: Record<string, number> = {};
  for (const inducement of nonStarInducements) {
    const foundInducement = chosenInducements.find(ind => ind.name === inducement.name);
    if (!foundInducement)
      throw new InducementError('Unknown inducement specified');

    inducementCounts[inducement.name] ??= 0;
    inducementCounts[inducement.name] += 1;
    if (inducementCounts[inducement.name] > foundInducement.max)
      throw new InducementError('Inducement maximum exceeded');

    const cost = getInducementPrice(foundInducement, team.roster.specialRules);
    if (cost === null && foundInducement.specialPriceRule === null) {
      if (inducement.option === undefined)
        throw new InducementError('Inducement requires an option');

      const foundOption = foundInducement.options.find(opt => opt.name === inducement.option);
      if (!foundOption)
        throw new InducementError('Invalid inducement option');

      const optionCost = getInducementPrice(foundOption, team.roster.specialRules);
      if (optionCost === null)
        throw new InducementError('Team cannot take the specified inducement');

      inducementCost += optionCost;
    } else {
      if (cost === null)
        throw new InducementError('Team cannot take the specified inducement');

      inducementCost += cost;
    }
  }
  return inducementCost + starPlayerCost;
}
router.post('/schedule/game/:gameId/purchaseInducements', (req, res, next) => {
  void (async(): Promise<void> => {
    const body = req.body as PurchaseInducementsBodyType;
    const game = await prisma.game.findUnique({
      where: { id: req.params.gameId },
      include: {
        home: { include: { roster: { select: { specialRules: true } }, players: { select: { _count: true } } } },
        away: { include: { roster: { select: { specialRules: true } }, players: { select: { _count: true } } } },
      },
    });
    if (!game) {
      res.status(400).send('Unknown game ID');
      return;
    }
    if (game.state !== 'Inducements') {
      res.status(400).send('Game not awaiting inducements');
      return;
    }

    let homeInducementCost = 0;
    let awayInducementCost = 0;
    try {
      homeInducementCost = await calculateInducementCosts(body.home ?? [], game.home);
      awayInducementCost = await calculateInducementCosts(body.away ?? [], game.away);
    } catch (e) {
      if (e instanceof InducementError) {
        res.status(400).send(e.message);
      } else {
        console.error(e);
        res.status(500).send('Unknown error');
      }
      return;
    }

    const treasuryCostHome = Math.max(0, homeInducementCost - game.pettyCashHome);
    const treasuryCostAway = Math.max(0, awayInducementCost - game.pettyCashAway);
    if (treasuryCostHome > game.home.treasury || treasuryCostAway > game.away.treasury) {
      res.status(400).send('Inducements are too expensive');
      return;
    }

    const homeUpdate = prisma.team.update({
      where: { name: game.homeTeamName },
      data: { treasury: { decrement: treasuryCostHome } },
    });
    const awayUpdate = prisma.team.update({
      where: { name: game.awayTeamName },
      data: { treasury: { decrement: treasuryCostAway } },
    });
    const gameStateUpdate = prisma.game.update({ where: { id: game.id }, data: { state: 'InProgress' } });
    await prisma.$transaction([homeUpdate, awayUpdate, gameStateUpdate]);
    res.send({ treasuryCostHome, treasuryCostAway });
  })().catch(next);
});

function incrementUpdateField(updateData: Prisma.IntFieldUpdateOperationsInput | number | undefined, amount: number):
Prisma.IntFieldUpdateOperationsInput | number {
  if (updateData === undefined)
    return { increment: amount };
  if (typeof updateData === 'number')
    return updateData + amount;
  if (updateData.increment === undefined)
    return { increment: amount };
  return { increment: updateData.increment + amount };
}

// End game
type EndGameBodyType = {
  injuries: Array<{
    playerId: string;
    injury: 'MNG' | 'NI' | 'MA' | 'AG' | 'PA' | 'ST' | 'AV' | 'DEAD';
  }>;
  starPlayerPoints: Record<string, {
    touchdowns?: number;
    casualties?: number;
    deflections?: number;
    interceptions?: number;
    completions?: number;
    otherSPP?: number;
  }>;
  touchdowns: [number, number];
  casualties: [number, number];
};
const statMinMax = {
  MA: [1, 9],
  ST: [1, 8],
  AG: [1, 6],
  PA: [1, 6],
  AV: [3, 11],
};
router.post('/schedule/game/:gameId/end', (req, res, next) => {
  void (async(): Promise<void> => {
    const body = req.body as EndGameBodyType;

    const selectPlayers = {
      include: {
        players: true,
        journeymen: true,
      },
    };
    const game = await prisma.game.findUnique({
      where: { id: req.params.gameId },
      include: {
        home: selectPlayers,
        away: selectPlayers,
      },
    });
    if (!game) {
      res.status(400).send('Unknown game');
      return;
    }
    if (game.state !== 'InProgress') {
      res.status(400).send('Game not in progress');
      return;
    }
    const players = [...game.home.players, ...game.home.journeymen, ...game.away.players, ...game.away.journeymen];
    let mvpChoicesHome = [...game.home.players.filter(p => !p.missNextGame), ...game.home.journeymen];
    let mvpChoicesAway = [...game.away.players.filter(p => !p.missNextGame), ...game.away.journeymen];
    const updateMap: Record<string, Prisma.PlayerUpdateArgs> =
      Object.fromEntries(players.map(({ id }) => [id, { where: { id }, data: { missNextGame: false } }]));
    for (const injury of body.injuries) {
      const player = players.find(p => p.id === injury.playerId);
      if (!player) {
        res.status(400).send('Player not found');
        return;
      }
      const mappedUpdate = updateMap[injury.playerId].data;
      mappedUpdate.missNextGame = true;
      if (injury.injury === 'MA' || injury.injury === 'ST' || injury.injury === 'AV') {
        if (player[injury.injury] - 1 < statMinMax[injury.injury][0]) {
          res.status(400).send('Invalid injury, stat cannot be reduced any more');
          return;
        }
        mappedUpdate[injury.injury] = { decrement: 1 };
      }
      if (injury.injury === 'PA' || injury.injury === 'AG') {
        if ((player[injury.injury] ?? 0) + 1 > statMinMax[injury.injury][1]) {
          res.status(400).send('Invalid injury, stat cannot be increased any more');
          return;
        }
        mappedUpdate[injury.injury] = { increment: 1 };
      }
      if (injury.injury === 'NI')
        mappedUpdate.nigglingInjuries = { increment: 1 };
      if (injury.injury === 'DEAD') {
        mappedUpdate.playerTeam = { disconnect: true };
        mappedUpdate.journeymanTeam = { disconnect: true };
        mvpChoicesAway = mvpChoicesAway.filter(p => p.id !== player.id);
        mvpChoicesHome = mvpChoicesHome.filter(p => p.id !== player.id);
      }
    }

    for (const [id, points] of Object.entries(body.starPlayerPoints)) {
      const player = players.find(p => p.id === id);
      if (!player) {
        res.status(400).send('Player not found');
        return;
      }
      updateMap[id] ??= { where: { id }, data: {} };
      const mappedUpdate = updateMap[id].data;

      mappedUpdate.casualties = incrementUpdateField(mappedUpdate.casualties, points.casualties ?? 0);
      mappedUpdate.deflections = incrementUpdateField(mappedUpdate.deflections, points.deflections ?? 0);
      mappedUpdate.interceptions = incrementUpdateField(mappedUpdate.interceptions, points.interceptions ?? 0);
      mappedUpdate.touchdowns = incrementUpdateField(mappedUpdate.touchdowns, points.touchdowns ?? 0);
      mappedUpdate.completions = incrementUpdateField(mappedUpdate.completions, points.completions ?? 0);
      mappedUpdate.starPlayerPoints = incrementUpdateField(
        mappedUpdate.starPlayerPoints,
        (points.completions ?? 0) +
        (points.deflections ?? 0) +
        (2 * (points.casualties ?? 0)) +
        (2 * (points.interceptions ?? 0)) +
        (3 * (points.touchdowns ?? 0)) +
        (points.otherSPP ?? 0)
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

    await prisma.$transaction([
      ...Object.values(updateMap).map(update => prisma.player.update(update)),
      prisma.game.update({
        where: { id: req.params.gameId },
        data: {
          tdHome: body.touchdowns[0],
          tdAway: body.touchdowns[1],
          casHome: body.casualties[0],
          casAway: body.casualties[1],
          state: 'Complete',
          home: { update: { state: 'PostGame' } },
          away: { update: { state: 'PostGame' } },
        },
      }),
    ]);
    res.send(updateMap);
  })().catch(next);
});

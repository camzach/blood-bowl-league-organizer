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
router.post('/schedule/game/:gameId/start', (req, res) => {
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
  })();
});

// Take on Journeymen
type SelectJourneymenBodyType = {
  home?: string;
  away?: string;
};
router.post('/schedule/game/:gameId/selectJourneymen', (req, res) => {
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
  })();
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
router.post('/schedule/game/:gameId/purchaseInducements', (req, res) => {
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

    try {
      const homeInducementCost = await calculateInducementCosts(body.home ?? [], game.home);
      const awayInducementCost = await calculateInducementCosts(body.away ?? [], game.away);
      res.send({ homeInducementCost, awayInducementCost });
    } catch (e) {
      if (e instanceof InducementError) {
        res.status(400).send(e.message);
      } else {
        console.error(e);
        res.status(500).send('Unknown error');
      }
    }
  })();
});

// End game

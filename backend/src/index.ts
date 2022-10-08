import express from 'express';
import type { Team } from '@prisma/client';
import { Prisma } from '@prisma/client';
import bodyParser from 'body-parser';
import { generateSchedule } from './schedule-generator';
import { prisma } from './prisma-singleton';
import { newPlayer } from './new-player';
import { router as gameStateTransitions } from './game-state-transitions';

const app = express();
const port = process.env.PORT ?? 8080;

app.use(bodyParser.json());

// Create team
type CreateTeamBodyType = {
  name: string;
  roster: string;
};
app.post('/team', (req, res, next) => {
  void (async(): Promise<void> => {
    const body = req.body as CreateTeamBodyType;
    try {
      const team = await prisma.team.create({
        data: {
          name: body.name,
          roster: { connect: { name: body.roster } },
        },
      });
      res.send(team);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        switch (err.code) {
          case 'P2002':
            res.status(400).send('A team with this name already exists!');
            break;
          case 'P2025':
            res.status(400).send('Unknown roster');
            break;
        }
      } else {
        console.error(err);
        res.sendStatus(500);
      }
    }
  })().catch(next);
});

app.use('/team/:teamName', (req, res, next) => {
  void (async(): Promise<void> => {
    const team = await prisma.team.findUnique({ where: { name: req.params.teamName } });
    if (!team) {
      res.status(400).send('Team not found');
      return;
    }
    res.locals.team = team;
    next();
  })().catch(next);
});

app.get('/team/:teamName', (req, res) => {
  res.send(res.locals.team);
});

// Hire player
type HirePlayerBodyType = {
  position: string;
  name?: string;
};
app.post('/team/:teamName/hirePlayer', (req, res, next) => {
  void (async(): Promise<void> => {
    const body = req.body as HirePlayerBodyType;
    const team = res.locals.team as Team;
    if (!['Draft', 'PostGame'].includes(team.state)) {
      res.status(400).send('Team cannot hire new players right now');
      return;
    }
    const position = await prisma.position.findFirst({
      where: {
        name: body.position,
        rosterName: team.rosterName,
      },
      include: { skills: true },
    });
    if (!position) {
      res.status(400).send('Unknown position');
      return;
    }
    const players = await prisma.player.findMany({ where: { playerTeamName: team.name } });
    if (players.length >= 16) {
      res.status(400).send('Team roster already full');
      return;
    }
    if (players.filter(p => p.positionId === position.id).length >= position.max) {
      res.status(400).send('Maximum positionals already rostered');
      return;
    }
    if (team.treasury < position.cost) {
      res.status(400).send('Cannot afford player');
      return;
    }
    const abc = await prisma.team.update({
      where: { name: req.params.teamName },
      data: {
        treasury: team.treasury - position.cost,
        players: { create: newPlayer(position, body.name) },
      },
    });
    res.send(abc);
  })().catch(next);
});

// Hire staff
type HireStaffBodyType = {
  type: 'apothecary' | 'assistantCoaches' | 'cheerleaders' | 'rerolls';
  quantity: number;
};
const maxMap: Record<HireStaffBodyType['type'], number> = {
  apothecary: 1,
  assistantCoaches: 6,
  cheerleaders: 12,
  rerolls: 8,
};
app.post('/team/:teamName/hireStaff', (req, res, next) => {
  void (async(): Promise<void> => {
    const body = req.body as HireStaffBodyType;
    const team = res.locals.team as Team;
    const { specialRules, rerollCost: baseRerollCost } = await prisma.roster.findUnique({
      where: { name: team.rosterName },
      select: { specialRules: true, rerollCost: true },
    }) ?? { specialRules: [], rerollCost: 0 };
    const costMap: Record<HireStaffBodyType['type'], number> = {
      apothecary: 50_000,
      assistantCoaches: 10_000,
      cheerleaders: 10_000,
      rerolls: team.state === 'Draft' ? baseRerollCost * 2 : baseRerollCost,
    };
    const cost = costMap[body.type] * body.quantity;
    if (cost > team.treasury) {
      res.status(400).send('Not enough money in treasury');
      return;
    }
    if (body.type === 'apothecary' && !specialRules.includes('Apothecary Allowed')) {
      res.status(400).send('Apothecary not allowed for this team');
      return;
    }
    if (Number(team[body.type]) + body.quantity > maxMap[body.type]) {
      res.status(400).send('Maximum exceeded');
      return;
    }
    await prisma.team.update({
      where: { name: team.name },
      data: {
        [body.type]: body.type === 'apothecary' ? true : { increment: body.quantity },
        treasury: { decrement: cost },
      },
    });
    res.send('Done :)');
  })().catch(next);
});

// Ready team
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
app.post('/team/:teamName/ready', (req, res, next) => {
  void (async(): Promise<void> => {
    const team = await prisma.team.findUnique({ where: { name: req.params.teamName }, include: { players: true } });
    if (!team) {
      res.status(400).send('Team not found');
      return;
    }
    if (!['Draft', 'PostGame'].includes(team.state)) {
      res.status(400).send('Team is not in the post-game or draft phase');
      return;
    }
    if (team.state === 'Draft' && team.players.length < 11) {
      res.status(400).send('Team has not hired a full roster yet');
      return;
    }
    const expensiveMistake = team.state === 'Draft'
      ? null
      : expensiveMistakesTable[
        Math.min(Math.floor(team.treasury / 100_000), 6)
      ][Math.floor(Math.random() * 6)];
    const expensiveMistakesCost = expensiveMistake !== null
      ? expensiveMistakesFunctions[expensiveMistake](team.treasury)
      : 0;
    await prisma.team.update({
      where: { name: req.params.teamName },
      data: { state: 'Ready', treasury: { decrement: expensiveMistakesCost } },
    });
    res.send({
      expensiveMistake,
      expensiveMistakesCost,
    });
  })().catch(next);
});

// Generate schedule
app.post('/schedule/generate', (req, res, next) => {
  void (async(): Promise<void> => {
    const teams = (await prisma.team.findMany({ select: { name: true } })).map(t => t.name);
    const pairings = generateSchedule(teams);
    const schedule = await prisma.game.createMany({ data: pairings });
    res.send(schedule);
  })().catch(next);
});

app.use('/', gameStateTransitions);

// Update Player
// Fire Player
// Retire Player
// Ready for next game

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

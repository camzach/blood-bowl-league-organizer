import express from 'express';
import type { Team } from '@prisma/client';
import { Prisma, PrismaClient } from '@prisma/client';
import bodyParser from 'body-parser';

const app = express();
const port = process.env.PORT ?? 8080;

const prisma = new PrismaClient();

app.use(bodyParser.json());

// Create team
type CreateTeamBodyType = {
  name: string;
  roster: string;
};
app.post('/team', (req, res) => {
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
        console.log(err);
        res.sendStatus(500);
      }
    }
  })();
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
  })();
});

app.get('/team/:teamName', (req, res) => {
  res.send(res.locals.team);
});

// Hire player
type HirePlayerBodyType = {
  position: string;
};
app.post('/team/:teamName/hirePlayer', (req, res) => {
  void (async(): Promise<void> => {
    const body = req.body as HirePlayerBodyType;
    const team = res.locals.team as Team;
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
    const players = await prisma.player.findMany({ where: { teamName: team.name } });
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
        players: {
          create: {
            MA: position.MA,
            AG: position.AG,
            PA: position.PA,
            ST: position.ST,
            AV: position.AV,
            teamValue: position.cost,
            skills: { connect: position.skills.map(({ name }) => ({ name })) },
            name: 'NewPlayer',
            position: { connect: { id: position.id } },
          },
        },
      },
    });
    res.send(abc);
  })();
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
app.post('/team/:teamName/hireStaff', (req, res) => {
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
  })();
});

// Generate schedule
app.post('/schedule/generate', (req, res) => {
  void (async(): Promise<void> => {
    const teams: Array<string | null> = (await prisma.team.findMany({ select: { name: true } })).map(t => t.name);
    const pairings: Prisma.ScheduledGameCreateManyInput[] = [];
    const homeAwayCounts = Object.fromEntries(teams.map(team => [team, [0, 0]])) as Record<string, [number, number]>;
    if (teams.length % 2 === 1)
      teams.push(null);

    const teamCount = teams.length;
    const rounds = teamCount - 1;
    const half = teamCount / 2;


    const teamIndices = teams.map((_, i) => i).slice(1);

    for (let round = 0; round < rounds; round++) {
      const newTeamIndices = [0].concat(teamIndices);

      const firstHalf = newTeamIndices.slice(0, half);
      const secondHalf = newTeamIndices.slice(half, teamCount).reverse();

      for (let i = 0; i < firstHalf.length; i++) {
        const pairing = [teams[firstHalf[i]], teams[secondHalf[i]]];
        if (pairing[0] === null || pairing[1] === null)
          continue;
        if (round % 2 === 0)
          pairing.reverse();
        homeAwayCounts[pairing[0]][0] += 1;
        homeAwayCounts[pairing[1]][1] += 1;
        pairings.push({
          homeTeamName: pairing[0],
          awayTeamName: pairing[1],
          round,
        });
      }

      // Rotating the array
      teamIndices.push(teamIndices.shift() as number);
    }

    const isScheduleBalanced = (): boolean =>
      Object.values(homeAwayCounts).every(([home, away]) => Math.abs(home - away) === (teams.includes(null) ? 0 : 1));

    const switchHomeAway = (game: (typeof pairings)[number]): void => {
      const { homeTeamName, awayTeamName } = game;
      game.homeTeamName = awayTeamName;
      game.awayTeamName = homeTeamName;
      homeAwayCounts[homeTeamName][0] -= 1;
      homeAwayCounts[homeTeamName][1] += 1;
      homeAwayCounts[awayTeamName][0] += 1;
      homeAwayCounts[awayTeamName][1] -= 1;
    };

    function rebalance(): void {
      if (teams.includes(null)) {
        const [tooManyHome] = Object.entries(homeAwayCounts)
          .find(([_, [home, away]]) => home - away > 0) ?? [] as never[];
        const [tooManyAway] = Object.entries(homeAwayCounts)
          .find(([_, [home, away]]) => away - home > 0) ?? [] as never[];
        const gameToFix = pairings.find(g => g.homeTeamName === tooManyHome && g.awayTeamName === tooManyAway);
        if (gameToFix) {
          switchHomeAway(gameToFix);
          return;
        }
        let gameA = null;
        let gameB = null;
        for (const intermediary of teams) {
          gameA = pairings.find(p => p.homeTeamName === tooManyHome && p.awayTeamName === intermediary);
          gameB = pairings.find(p => p.awayTeamName === tooManyAway && p.homeTeamName === intermediary);
          if (!gameA || !gameB) {
            gameA = null;
            gameB = null;
          } else {
            break;
          }
        }
        if (!gameA || !gameB) {
          console.error('Somehow failed to balance. This should not be possible, so the logic must be wrong.');
          process.exit(0);
          return;
        }
        switchHomeAway(gameA);
        switchHomeAway(gameB);
      } else {
        const [tooManyHome] = Object.entries(homeAwayCounts)
          .find(([_, [home, away]]) => home - away > 1) ?? [null];
        if (tooManyHome !== null) {
          const game = pairings.find(g =>
            g.homeTeamName === tooManyHome &&
            homeAwayCounts[g.awayTeamName][1] > homeAwayCounts[g.awayTeamName][0]) ?? null as never;
          switchHomeAway(game);
          return;
        }
        const [tooManyAway] = Object.entries(homeAwayCounts)
          .find(([_, [home, away]]) => away - home > 1) ?? [] as never[];
        const game = pairings.find(g =>
          g.homeTeamName === tooManyAway &&
            homeAwayCounts[g.awayTeamName][1] > homeAwayCounts[g.awayTeamName][0]) ?? null as never;
        switchHomeAway(game);
      }
    }

    while (!isScheduleBalanced())
      rebalance();

    const schedule = await prisma.scheduledGame.createMany({ data: pairings });
    res.send(schedule);
  })();
});

// Start game
// Take on Journeymen
// Purchase Inducements
// End game
// Update Player
// Fire Player
// Retire Player
// Ready for next game

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

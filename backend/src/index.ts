import express from 'express';
import type { Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import bodyParser from 'body-parser';

const app = express();
const port = process.env.PORT ?? 8080;

const prisma = new PrismaClient();

app.use(bodyParser.json());

// Create team
app.post('/team', (req: { body: Prisma.TeamCreateInput }, res) => {
  void prisma.team.create({ data: { name: req.body.name } })
    .then(res.send)
    .catch(() => res.sendStatus(500));
});

app.get('/team/:name', (req, res) => {
  void prisma.team.findFirst({ where: { name: req.params.name } })
    .then(team => {
      res.send(team);
    });
});

// Hire player
// Hire staff
// Generate schedule
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

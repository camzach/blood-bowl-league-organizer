/* eslint-disable drizzle/enforce-delete-with-where */
import * as schema from "./schema";
import { config } from "dotenv";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import readline from "node:readline/promises";
import { faker } from "@faker-js/faker";
import nanoid from "utils/nanoid";
import { inArray } from "drizzle-orm";

config();
// Must import db asynchronously so env gets set first
neonConfig.webSocketConstructor = ws;
const { db } = await import("../utils/drizzle");

console.warn(`
*****************************************************
*                     WARNING                       *
* THIS SCRIPT IS NOT SAFE TO RUN IN A PRODUCTION    *
* ENVIRONMENT. DO NOT RUN IT UNLESS YOU ARE TRYING  *
* TO START A NEW PROD ENVIRONMENT OR YOU REALLY     *
* KNOW WHAT YOU'RE DOING                            *
*****************************************************
`);
const rl = readline.createInterface(process.stdin, process.stdout);
async function prompt() {
  const response = await rl.question(
    "Type YES to continue\nType DB to see your current connection string\nType anything else to quit\n> ",
  );
  if (response === "DB") {
    console.log(process.env.DATABASE_URL);
    return prompt();
  } else if (response === "YES") {
    console.log("Sure hope you know what you're doing... :)");
    return true;
  }
  console.log("Quitting.");
  return false;
}
if (!(await prompt())) {
  process.exit();
}

await db.transaction(async (tx) => {
  /* vv CLEAR DB vv */
  await Promise.all([
    tx.delete(schema.bracketGame),
    tx.delete(schema.roundRobinGame),
    tx.delete(schema.gameDetailsToInducement),
    tx.delete(schema.gameDetailsToStarPlayer),
    tx.delete(schema.improvement),
  ]);
  await Promise.all([
    tx.delete(schema.game),
    tx.delete(schema.season),
    tx.delete(schema.player),
  ]);
  await Promise.all([tx.delete(schema.gameDetails), tx.delete(schema.team)]);
  await Promise.all([tx.delete(schema.league), tx.delete(schema.coachToTeam)]);
  /* ^^ CLEAR DB ^^ */

  const LEAGUE_NAME = "Testing";

  await tx.insert(schema.league).values({ name: LEAGUE_NAME });

  const teamNames = new Set<string>();
  while (teamNames.size < 4) {
    teamNames.add(faker.animal.type());
  }
  const rosterNames = (
    await db.select({ name: schema.roster.name }).from(schema.roster)
  )
    .map((val) => [val, Math.random()] as const)
    .sort((a, b) => b[1] - a[1])
    .map(([val, _]) => val.name);
  const teams = await tx
    .insert(schema.team)
    .values(
      Array.from(teamNames).map((name, i) => ({
        name,
        rosterName: rosterNames[i],
        id: nanoid(),
        leagueName: LEAGUE_NAME,
      })),
    )
    .returning({ id: schema.team.id, rosterName: schema.team.rosterName });

  const rosters = keyBy(
    await tx.query.roster.findMany({
      where: inArray(
        schema.roster.name,
        teams.map((t) => t.rosterName),
      ),
      with: {
        rosterSlots: {
          with: { position: true },
        },
      },
    }),
    "name",
  );

  const players = teams.flatMap((team) => {
    const roster = rosters[team.rosterName];
    const numPlayers = faker.number.int({ min: 11, max: 16 });
    const newPlayers: Array<{
      name: string;
      id: string;
      number: number;
      positionId: string;
      teamId: string;
      membershipType: "player";
    }> = [];
    for (let i = 0; i < numPlayers; i++) {
      const availableSlots = roster.rosterSlots.filter((slot) => slot.max > 0);
      const slot =
        availableSlots[Math.floor(Math.random() * availableSlots.length)];
      const position =
        slot.position[Math.floor(Math.random() * slot.position.length)];
      slot.max -= 1;
      newPlayers.push({
        name: faker.person.fullName(),
        id: nanoid(),
        number: i,
        positionId: position.id,
        teamId: team.id,
        membershipType: "player",
      });
    }
    newPlayers.sort((a, b) => b.positionId.localeCompare(a.positionId));
    newPlayers.forEach((p, i) => (p.number = i));
    return newPlayers;
  });

  await tx.insert(schema.player).values(players);
});

function keyBy<
  A extends object,
  K extends keyof {
    [P in keyof A as A[P] extends PropertyKey ? P : never]: unknown;
  },
>(array: A[], key: K) {
  return array.reduce(
    (r, x) => ({ ...r, [x[key] as unknown as PropertyKey]: x }),
    {} as { [P in A[K] as A[K] extends PropertyKey ? A[K] : never]: A },
  );
}

process.exit(0);

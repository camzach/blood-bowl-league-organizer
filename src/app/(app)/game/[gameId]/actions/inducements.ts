"use server";
import { eq, InferInsertModel, sql } from "drizzle-orm";
import z from "zod";
import {
  gameDetailsToStarPlayer,
  gameDetailsToInducement,
  team,
  game as dbGame,
} from "~/db/schema";
import { db } from "~/utils/drizzle";
import { action, teamPermissionMiddleware } from "~/utils/safe-action";
import { calculateInducementCosts } from "./calculate-inducement-costs";

const inducementChoicesSchema = z.object({
  stars: z.array(z.string()).max(2),
  inducements: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().int().nonnegative().default(1),
    }),
  ),
});

export const purchaseInducements = action
  .inputSchema(
    z.object({
      game: z.string(),
      home: inducementChoicesSchema,
      away: inducementChoicesSchema,
    }),
  )
  .use(async ({ next, clientInput }) => {
    const { game: gameId } = z.object({ game: z.string() }).parse(clientInput);
    const game = await db.query.game.findFirst({
      where: { id: gameId },
      with: {
        homeDetails: {
          with: {
            team: { columns: { id: true } },
          },
        },
        awayDetails: {
          with: {
            team: { columns: { id: true } },
          },
        },
      },
    });
    if (!game) throw new Error("Game does not exist");
    if (!game.homeDetails || !game.awayDetails)
      throw new Error("Game does not have two teams");

    return next({
      ctx: {
        authParams: {
          teamId: [game.homeDetails.team.id, game.awayDetails.team.id],
          allowAdmin: true,
        },
      },
    });
  })
  .use(teamPermissionMiddleware)
  .action(async ({ parsedInput: input }) => {
    return db.transaction(async (tx) => {
      const detailsFields = {
        columns: {
          id: true,
          pettyCashAwarded: true,
        },
        with: {
          team: {
            columns: {
              id: true,
              treasury: true,
              chosenSpecialRuleName: true,
            },
            with: {
              roster: {
                with: {
                  specialRuleToRoster: true,
                },
              },
              players: {
                where: {
                  missNextGame: false,
                  membershipType: { NOT: "retired" },
                },
              },
            },
          },
        },
      } as const satisfies Parameters<typeof tx.query.gameDetails.findFirst>[0];
      const game = await tx.query.game.findFirst({
        where: { id: input.game },
        columns: {
          id: true,
          state: true,
        },
        with: {
          homeDetails: detailsFields,
          awayDetails: detailsFields,
        },
      });
      if (!game) throw new Error("Game does not exist");
      if (!game.homeDetails || !game.awayDetails)
        throw new Error("Game does not have two teams");

      if (game.state !== "inducements")
        throw new Error("Game not awaiting inducements");

      const teamSpecialRules = (
        team: (typeof game.homeDetails | typeof game.awayDetails)["team"],
      ) => {
        const rules = team.roster.specialRuleToRoster.map(
          (r) => r.specialRuleName,
        );
        if (team.chosenSpecialRuleName) rules.push(team.chosenSpecialRuleName);
        return rules;
      };

      const homeInducementCost = await calculateInducementCosts(
        input.home.inducements,
        input.home.stars,
        teamSpecialRules(game.homeDetails.team),
        game.homeDetails.team.players.length,
        game.homeDetails.team.roster.name,
        tx,
      );
      const awayInducementCost = await calculateInducementCosts(
        input.away.inducements,
        input.away.stars,
        teamSpecialRules(game.awayDetails.team),
        game.awayDetails.team.players.length,
        game.awayDetails.team.roster.name,
        tx,
      );

      const extraPettyCash = { home: 0, away: 0 };
      let treasuryCostHome =
        homeInducementCost - game.homeDetails.pettyCashAwarded;
      let treasuryCostAway =
        awayInducementCost - game.awayDetails.pettyCashAwarded;
      if (game.homeDetails.pettyCashAwarded > 0) {
        extraPettyCash.home += treasuryCostAway;
        treasuryCostHome -= extraPettyCash.home;
      } else if (game.awayDetails.pettyCashAwarded > 0) {
        extraPettyCash.away += treasuryCostHome;
        treasuryCostAway -= extraPettyCash.away;
      }
      treasuryCostHome = Math.max(0, treasuryCostHome);
      treasuryCostAway = Math.max(0, treasuryCostAway);
      if (
        (game.homeDetails.pettyCashAwarded === 0 && treasuryCostAway > 0) ||
        (game.awayDetails.pettyCashAwarded === 0 && treasuryCostHome > 0) ||
        treasuryCostHome > game.homeDetails.team.treasury ||
        treasuryCostAway > game.awayDetails.team.treasury
      )
        throw new Error("Inducements are too expensive");

      const starInserts: Array<
        InferInsertModel<typeof gameDetailsToStarPlayer>
      > = [];
      for (const star of input.home.stars) {
        starInserts.push({
          starPlayerName: star,
          gameDetailsId: game.homeDetails.id,
        });
      }
      for (const star of input.away.stars) {
        starInserts.push({
          starPlayerName: star,
          gameDetailsId: game.awayDetails.id,
        });
      }

      const inducementInserts: Array<
        InferInsertModel<typeof gameDetailsToInducement>
      > = [];
      for (const inducement of input.home.inducements) {
        if (inducement.quantity <= 0) continue;
        inducementInserts.push({
          inducementName: inducement.name,
          count: inducement.quantity,
          gameDetailsId: game.homeDetails.id,
        });
      }
      for (const inducement of input.away.inducements) {
        if (inducement.quantity <= 0) continue;
        inducementInserts.push({
          inducementName: inducement.name,
          count: inducement.quantity,
          gameDetailsId: game.awayDetails.id,
        });
      }

      await Promise.all([
        tx
          .update(team)
          .set({
            treasury: sql`${team.treasury} - ${treasuryCostHome}`,
          })
          .where(eq(team.id, game.homeDetails.team.id)),
        tx
          .update(team)
          .set({
            treasury: sql`${team.treasury} - ${treasuryCostAway}`,
          })
          .where(eq(team.id, game.awayDetails.team.id)),
        tx
          .update(dbGame)
          .set({
            state: "in_progress",
          })
          .where(eq(dbGame.id, input.game)),
        starInserts.length > 0 &&
          tx.insert(gameDetailsToStarPlayer).values(starInserts),
        inducementInserts.length > 0 &&
          tx.insert(gameDetailsToInducement).values(inducementInserts),
      ]);

      return {
        treasuryCostHome,
        treasuryCostAway,
      };
    });
  });

"use server";
import { eq, and } from "drizzle-orm";
import z from "zod";
import nanoid from "~/utils/nanoid";
import {
  keywordToPosition,
  player,
  gameDetails,
  improvement,
  game as dbGame,
} from "~/db/schema";
import calculateTV from "~/utils/calculate-tv";
import { db } from "~/utils/drizzle";
import { action, teamPermissionMiddleware } from "~/utils/safe-action";

export const selectJourneymen = action
  .inputSchema(
    z.object({
      home: z.string().optional(),
      away: z.string().optional(),
      game: z.string(),
    }),
  )
  .use(async ({ next, clientInput }) => {
    const { game: gameId } = z.object({ game: z.string() }).parse(clientInput);
    const game = await db.query.game.findFirst({
      where: eq(dbGame.id, gameId),
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
    if (!game) throw new Error("Failed to find game");
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
      const teamFields = {
        columns: {
          id: true,
          apothecary: true,
          assistantCoaches: true,
          cheerleaders: true,
          rerolls: true,
        },
        with: {
          roster: {
            columns: {
              name: true,
              rerollCost: true,
            },
            with: {
              specialRuleToRoster: true,
              rosterSlots: {
                with: {
                  position: {
                    with: {
                      keywordToPosition: {
                        where: eq(keywordToPosition.keywordName, "Lineman"),
                      },
                    },
                  },
                },
              },
            },
          },
          players: {
            where: and(
              eq(player.missNextGame, false),
              eq(player.membershipType, "player"),
            ),
            with: {
              improvements: {
                with: {
                  skill: true,
                },
              },
              position: {
                with: {
                  rosterSlot: {
                    with: {
                      roster: {
                        with: {
                          specialRuleToRoster: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      } satisfies Parameters<typeof tx.query.team.findFirst>[0];

      const game = await tx.query.game.findFirst({
        where: eq(dbGame.id, input.game),
        columns: {
          id: true,
          state: true,
        },
        with: {
          homeDetails: {
            with: { team: teamFields },
          },
          awayDetails: {
            with: { team: teamFields },
          },
        },
      });
      if (!game) throw new Error("Failed to find game");
      if (!game.homeDetails || !game.awayDetails)
        throw new Error("Game does not have two teams");

      if (game.state !== "journeymen")
        throw new Error("Game not awaiting journeymen choice");

      const homeChoice =
        input.home !== undefined
          ? game.homeDetails.team.roster.rosterSlots
              .flatMap((slot) => slot.position)
              .find((pos) => pos.id === input.home)
          : undefined;
      const awayChoice =
        input.away !== undefined
          ? game.awayDetails.team.roster.rosterSlots
              .flatMap((slot) => slot.position)
              .find((pos) => pos.id === input.away)
          : undefined;

      const homePlayers = game.homeDetails.team.players.length;
      const awayPlayers = game.awayDetails.team.players.length;
      if (homePlayers < 11 && !homeChoice)
        throw new Error("Missing journeymen selection for home team");
      else if (homePlayers >= 11 && homeChoice)
        throw new Error("Home team will not take any journeymen");
      if (awayPlayers < 11 && !awayChoice)
        throw new Error("Missing journeymen selection for away team");
      else if (awayPlayers >= 11 && awayChoice)
        throw new Error("Away team will not take any journeymen");

      let homeTV = calculateTV(game.homeDetails.team);
      let awayTV = calculateTV(game.awayDetails.team);

      const newPlayers: Array<typeof player.$inferInsert> = [];
      if (homeChoice) {
        homeTV += homeChoice.cost * (11 - homePlayers);
        for (let i = 0; i < 11 - homePlayers; i++) {
          newPlayers.push({
            id: nanoid(),
            number: 99 - i,
            positionId: homeChoice.id,
            membershipType: "journeyman" as const,
            teamId: game.homeDetails.teamId,
          });
        }
      }
      if (awayChoice) {
        awayTV += awayChoice.cost * (11 - awayPlayers);
        for (let i = 0; i < 11 - awayPlayers; i++) {
          newPlayers.push({
            id: nanoid(),
            number: 99 - i,
            positionId: awayChoice.id,
            membershipType: "journeyman" as const,
            teamId: game.awayDetails.teamId,
          });
        }
      }

      const pettyCashHome = Math.max(0, awayTV - homeTV);
      const pettyCashAway = Math.max(0, homeTV - awayTV);

      await Promise.all([
        tx
          .update(dbGame)
          .set({
            state: "inducements",
          })
          .where(eq(dbGame.id, input.game)),
        tx
          .update(gameDetails)
          .set({
            pettyCashAwarded: pettyCashHome,
          })
          .where(eq(gameDetails.id, game.homeDetails.id)),
        tx
          .update(gameDetails)
          .set({
            pettyCashAwarded: pettyCashAway,
          })
          .where(eq(gameDetails.id, game.awayDetails.id)),
        ...(newPlayers.length > 0
          ? [
              tx
                .insert(player)
                .values(newPlayers)
                .then(() =>
                  tx.insert(improvement).values(
                    newPlayers.map((p) => ({
                      playerId: p.id,
                      type: "automatic_skill" as const,
                      order: -1,
                      skillName: "Loner (4+)",
                    })),
                  ),
                ),
            ]
          : []),
      ]);

      return {
        pettyCashHome,
        pettyCashAway,
      };
    });
  });

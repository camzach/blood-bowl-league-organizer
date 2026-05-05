"use server";
import { eq, and, inArray } from "drizzle-orm";
import z from "zod";
import {
  player,
  keywordToPosition,
  weatherOpts,
  gameDetails,
  game as dbGame,
  team as dbTeam,
} from "~/db/schema";
import calculateTV from "~/utils/calculate-tv";
import { d6 } from "~/utils/d6";
import { db } from "~/utils/drizzle";
import { action, teamPermissionMiddleware } from "~/utils/safe-action";

export const start = action
  .inputSchema(z.object({ id: z.string() }))
  .use(async ({ next, clientInput }) => {
    const { id } = z.object({ id: z.string() }).parse(clientInput);
    const game = await db.query.game.findFirst({
      where: eq(dbGame.id, id),
      with: {
        homeDetails: { columns: { teamId: true } },
        awayDetails: { columns: { teamId: true } },
      },
    });
    if (!game) throw new Error("Could not find game");
    if (!game.homeDetails || !game.awayDetails)
      throw new Error("Game does not have two teams");

    return next({
      ctx: {
        authParams: {
          teamId: [game.homeDetails.teamId, game.awayDetails.teamId],
          allowAdmin: true,
        },
      },
    });
  })
  .use(teamPermissionMiddleware)
  .action(async ({ parsedInput: { id } }) => {
    return db.transaction(async (tx) => {
      const teamDetailsOptions = {
        with: {
          team: {
            with: {
              players: {
                where: and(
                  inArray(player.membershipType, ["player", "journeyman"]),
                  eq(player.missNextGame, false),
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
                      keywordToPosition: {
                        with: {
                          keyword: true,
                        },
                      },
                    },
                  },
                },
              },
              roster: {
                with: {
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
            },
          },
        },
      } as const satisfies Parameters<typeof tx.query.gameDetails.findFirst>[0];

      const game = await tx.query.game.findFirst({
        where: eq(dbGame.id, id),
        with: {
          homeDetails: teamDetailsOptions,
          awayDetails: teamDetailsOptions,
        },
      });
      if (!game) throw new Error("Could not find game");
      if (!game.homeDetails || !game.awayDetails)
        throw new Error("Game does not have two teams");

      if (
        game.homeDetails.team.state !== "ready" ||
        game.awayDetails.team.state !== "ready"
      )
        throw new Error("Teams are not ready to start a game");

      if (game.state !== "scheduled")
        throw new Error("Game has already been started");

      const weatherTable = [
        null as never,
        null as never,
        "sweltering_heat",
        "very_sunny",
        ...Array.from(Array(7), () => "perfect" as const),
        "pouring_rain",
        "blizzard",
      ] satisfies Array<(typeof weatherOpts)[number]>;

      const fairweatherFansHome = Math.ceil(Math.random() * 3);
      const fanFactorHome =
        game.homeDetails.team.dedicatedFans + fairweatherFansHome;
      const fairweatherFansAway = Math.ceil(Math.random() * 3);
      const fanFactorAway =
        game.awayDetails.team.dedicatedFans + fairweatherFansAway;
      const weatherRoll = [d6(), d6()];
      const weatherResult = weatherTable[weatherRoll[0] + weatherRoll[1]];

      const homeJourneymen = {
        count: Math.max(0, 11 - game.homeDetails.team.players.length),
        players: game.homeDetails.team.roster.rosterSlots.flatMap((slot) =>
          slot.position.map((pos) => pos.name),
        ),
      };
      const awayJourneymen = {
        count: Math.max(0, 11 - game.awayDetails.team.players.length),
        players: game.awayDetails.team.roster.rosterSlots.flatMap((slot) =>
          slot.position.map((pos) => pos.name),
        ),
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

      const homeTV = calculateTV(game.homeDetails.team);
      const awayTV = calculateTV(game.awayDetails.team);
      const pettyCashHome = Math.max(0, awayTV - homeTV);
      const pettyCashAway = Math.max(0, homeTV - awayTV);

      const teamUpdate = tx
        .update(dbTeam)
        .set({
          state: "playing",
        })
        .where(
          inArray(dbTeam.id, [
            game.homeDetails.team.id,
            game.awayDetails.team.id,
          ]),
        );
      const gameUpdate = tx
        .update(dbGame)
        .set({
          state:
            homeJourneymen.count > 0 || awayJourneymen.count > 0
              ? "journeymen"
              : "inducements",
          weather: weatherResult,
        })
        .where(eq(dbGame.id, game.id));
      const homeDetailsUpdate = tx
        .update(gameDetails)
        .set({
          journeymenRequired: homeJourneymen.count,
          fanFactor: fanFactorHome,
          pettyCashAwarded: pettyCashHome,
        })
        .where(eq(gameDetails.id, game.homeDetails.id));
      const awayDetailsUpdate = tx
        .update(gameDetails)
        .set({
          journeymenRequired: awayJourneymen.count,
          fanFactor: fanFactorAway,
          pettyCashAwarded: pettyCashAway,
        })
        .where(eq(gameDetails.id, game.awayDetails.id));

      return Promise.all([
        teamUpdate,
        gameUpdate,
        homeDetailsUpdate,
        awayDetailsUpdate,
      ]).then(() => result);
    });
  });

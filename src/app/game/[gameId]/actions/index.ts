"use server";
import { z } from "zod";
import { action } from "utils/safe-action";
import { db } from "utils/drizzle";
import {
  and,
  eq,
  not,
  gte,
  inArray,
  sql,
  SQL,
  InferInsertModel,
  SQLWrapper,
} from "drizzle-orm";
import {
  game as dbGame,
  player,
  rosterSlot,
  team as dbTeam,
  weatherOpts,
  gameDetails,
  improvement,
  team,
  gameDetailsToStarPlayer,
  gameDetailsToInducement,
  bracketGame,
  season,
} from "db/schema";
import { canEditTeam } from "app/team/[teamId]/edit/actions";
import calculateTV from "utils/calculate-tv";
import { nanoid } from "nanoid";
import { calculateInducementCosts } from "./calculate-inducement-costs";
import { getPlayerStats } from "utils/get-computed-player-fields";
import { d6 } from "utils/d6";
import { currentUser } from "@clerk/nextjs/server";

export const start = action
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput: { id } }) => {
    return db.transaction(async (tx) => {
      const teamDetailsOptions = {
        with: {
          team: {
            with: {
              players: {
                where: eq(player.missNextGame, false),
                with: {
                  improvements: { with: { skill: true } },
                  position: {
                    with: {
                      rosterSlot: {
                        with: {
                          roster: { with: { specialRuleToRoster: true } },
                        },
                      },
                    },
                  },
                },
              },
              roster: {
                with: {
                  rosterSlots: {
                    where: gte(rosterSlot.max, 12),
                    with: { position: true },
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

      if (!canEditTeam([game.homeDetails.teamId, game.awayDetails.teamId], tx))
        throw new Error("User does not have permission for this game");

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

export const selectJourneymen = action
  .schema(
    z.object({
      home: z.string().optional(),
      away: z.string().optional(),
      game: z.string(),
    }),
  )
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
            columns: { name: true, rerollCost: true },
            with: {
              specialRuleToRoster: true,
              rosterSlots: {
                where: gte(rosterSlot.max, 12),
                with: { position: true },
              },
            },
          },
          players: {
            where: and(
              eq(player.missNextGame, false),
              eq(player.membershipType, "player"),
            ),
            with: {
              improvements: { with: { skill: true } },
              position: {
                with: {
                  rosterSlot: {
                    with: { roster: { with: { specialRuleToRoster: true } } },
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
          homeDetails: { with: { team: teamFields } },
          awayDetails: { with: { team: teamFields } },
        },
      });
      if (!game) throw new Error("Failed to find game");
      if (!game.homeDetails || !game.awayDetails)
        throw new Error("Game does not have two teams");

      if (!canEditTeam([game.homeDetails.team.id, game.awayDetails.team.id]))
        throw new Error("User does not have permission to modify this game");

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
      console.log(pettyCashHome, pettyCashAway);

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
                      type: "chosen_skill" as const,
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
  .schema(
    z.object({
      game: z.string(),
      home: inducementChoicesSchema,
      away: inducementChoicesSchema,
    }),
  )
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
              roster: { with: { specialRuleToRoster: true } },
              players: {
                where: and(
                  eq(player.missNextGame, false),
                  not(eq(player.membershipType, "retired")),
                ),
              },
            },
          },
        },
      } as const satisfies Parameters<typeof tx.query.gameDetails.findFirst>[0];
      const game = await tx.query.game.findFirst({
        where: eq(dbGame.id, input.game),
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

      if (
        !canEditTeam([game.homeDetails.team.id, game.awayDetails.team.id], tx)
      )
        throw new Error("User does not have permission for this game");
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
        tx,
      );
      const awayInducementCost = await calculateInducementCosts(
        input.away.inducements,
        input.away.stars,
        teamSpecialRules(game.awayDetails.team),
        game.awayDetails.team.players.length,
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

export const end = action
  .schema(
    z.object({
      game: z.string(),
      playerUpdates: z.record(
        z.string(),
        z.object({
          injury: z
            .enum(["mng", "ni", "ma", "ag", "pa", "st", "av", "dead"])
            .optional(),
          starPlayerPoints: z
            .object({
              touchdowns: z.number().int().optional(),
              casualties: z.number().int().optional(),
              deflections: z.number().int().optional(),
              interceptions: z.number().int().optional(),
              completions: z.number().int().optional(),
              otherSPP: z.number().int().optional(),
            })
            .optional(),
        }),
      ),
      touchdowns: z.tuple([z.number().int(), z.number().int()]),
      casualties: z.tuple([z.number().int(), z.number().int()]),
    }),
  )
  .action(async ({ parsedInput: input }) => {
    return db.transaction(async (tx) => {
      const user = await currentUser();
      if (!user?.publicMetadata.league) {
        throw new Error("No league currently active 💀");
      }
      const detailsFields = {
        with: {
          team: {
            with: {
              players: {
                with: {
                  position: true,
                  improvements: true,
                },
              },
            },
          },
        },
      } satisfies Parameters<typeof tx.query.gameDetails.findFirst>[0];
      const game = await tx.query.game.findFirst({
        where: eq(dbGame.id, input.game),
        columns: {
          id: true,
          state: true,
        },
        with: {
          homeDetails: detailsFields,
          awayDetails: detailsFields,
        },
      });
      if (!game) throw new Error("Game not found");
      if (!game.homeDetails || !game.awayDetails)
        throw new Error("Game does not have two teams");

      if (!canEditTeam([game.homeDetails.teamId, game.awayDetails.teamId]))
        throw new Error("User does not have permission for this game");

      const statMinMax = {
        ma: [1, 9],
        st: [1, 8],
        ag: [1, 6],
        pa: [1, 6],
        av: [3, 11],
      };

      if (game.state !== "in_progress") throw new Error("Game not in progress");

      const players = [
        ...game.homeDetails.team.players,
        ...game.awayDetails.team.players,
      ];
      let mvpChoicesHome = [
        ...game.homeDetails.team.players.filter((p) => !p.missNextGame),
      ];
      let mvpChoicesAway = [
        ...game.awayDetails.team.players.filter((p) => !p.missNextGame),
      ];
      const updateMap: Record<
        string,
        Parameters<ReturnType<typeof tx.update<typeof player>>["set"]>[0]
      > = Object.fromEntries(
        players.map(({ id }) => [id, { missNextGame: false }]),
      );
      for (const [playerId, update] of Object.entries(input.playerUpdates)) {
        const fetchedPlayer = players.find((p) => p.id === playerId);
        if (!fetchedPlayer) throw new Error("Player not found");
        const updatedPlayer = {
          ...fetchedPlayer,
          ...getPlayerStats(fetchedPlayer),
        };

        const mappedUpdate = updateMap[playerId];
        if (update.injury !== undefined) {
          mappedUpdate.missNextGame = true;
          if (
            update.injury === "ma" ||
            update.injury === "st" ||
            update.injury === "av"
          ) {
            if (updatedPlayer[update.injury] - 1 < statMinMax[update.injury][0])
              throw new Error(
                "Invalid injury, stat cannot be reduced any more",
              );
            mappedUpdate[`${update.injury}Injuries`] = sql`${
              player[`${update.injury}Injuries`]
            } + 1`;
          }
          if (update.injury === "pa" || update.injury === "ag") {
            if (
              (updatedPlayer[update.injury] ?? 6) + 1 >
              statMinMax[update.injury][1]
            )
              throw new Error(
                "Invalid injury, stat cannot be increased any more",
              );
            mappedUpdate[`${update.injury}Injuries`] = sql`${
              player[`${update.injury}Injuries`]
            } + 1`;
          }
          if (update.injury === "ni")
            mappedUpdate.nigglingInjuries = sql`${player.nigglingInjuries} + 1`;
          if (update.injury === "dead") {
            mappedUpdate.teamId = null;
            mappedUpdate.membershipType = null;
            mappedUpdate.dead = true;
            mvpChoicesAway = mvpChoicesAway.filter(
              (p) => p.id !== updatedPlayer.id,
            );
            mvpChoicesHome = mvpChoicesHome.filter(
              (p) => p.id !== updatedPlayer.id,
            );
          }
        }
        if (update.starPlayerPoints !== undefined) {
          for (const [_type, amount] of Object.entries(
            update.starPlayerPoints,
          )) {
            const type = _type as keyof typeof update.starPlayerPoints;
            mappedUpdate[type as keyof typeof update.starPlayerPoints] =
              sql`${player[type]} + ${amount}`;
          }
        }
      }

      const mvpHome =
        mvpChoicesHome[Math.floor(Math.random() * mvpChoicesHome.length)];
      updateMap[mvpHome.id].mvps = sql`${player.mvps} + 1`;

      const mvpAway =
        mvpChoicesAway[Math.floor(Math.random() * mvpChoicesAway.length)];
      updateMap[mvpAway.id].mvps = sql`${player.mvps} + 1`;

      const fansUpdate = (won: boolean, currentFans: number) => {
        const roll = d6();
        let newFans = currentFans;
        let updateSql: SQL | undefined = undefined;
        if (won && roll > currentFans) {
          newFans += 1;
          updateSql = sql`${team.dedicatedFans} + 1`;
        } else if (!won && roll < currentFans) {
          newFans -= 1;
          updateSql = sql`${team.dedicatedFans} - 1`;
        }
        return {
          roll,
          currentFans,
          newFans,
          sql: updateSql,
        };
      };

      const [homeFansUpdate, awayFansUpdate] = [
        fansUpdate(
          input.touchdowns[0] > input.touchdowns[1],
          game.homeDetails.team.dedicatedFans,
        ),
        fansUpdate(
          input.touchdowns[1] > input.touchdowns[0],
          game.awayDetails.team.dedicatedFans,
        ),
      ];

      const sharedWinnings =
        ((game.homeDetails.fanFactor + game.awayDetails.fanFactor) / 2) *
        10_000;
      const homeWinnings = input.touchdowns[0] * 10_000 + sharedWinnings;
      const awayWinnings = input.touchdowns[1] * 10_000 + sharedWinnings;

      const playerUpdates = Object.keys(updateMap).map((p) =>
        tx.update(player).set(updateMap[p]).where(eq(player.id, p)),
      );
      const gameUpdate = tx
        .update(dbGame)
        .set({
          state: "complete",
        })
        .where(eq(dbGame.id, game.id));
      const homeDetailsUpdate = tx
        .update(gameDetails)
        .set({
          casualties: input.casualties[0],
          touchdowns: input.touchdowns[0],
          mvpId: mvpHome.id,
        })
        .where(eq(gameDetails.id, game.homeDetails.id));
      const awayDetailsUpdate = tx
        .update(gameDetails)
        .set({
          casualties: input.casualties[1],
          touchdowns: input.touchdowns[1],
          mvpId: mvpAway.id,
        })
        .where(eq(gameDetails.id, game.awayDetails.id));

      const homeTeamUpdate = tx
        .update(team)
        .set({
          state: "improving",
          dedicatedFans: homeFansUpdate.sql,
          treasury: sql`${team.treasury} + ${homeWinnings}`,
        })
        .where(eq(team.id, game.homeDetails.teamId));
      const awayTeamUpdate = tx
        .update(team)
        .set({
          state: "improving",
          dedicatedFans: awayFansUpdate.sql,
          treasury: sql`${team.treasury} + ${awayWinnings}`,
        })
        .where(eq(team.id, game.awayDetails.teamId));

      const allUpdates: Array<SQLWrapper> = [
        ...playerUpdates,
        gameUpdate,
        homeDetailsUpdate,
        awayDetailsUpdate,
        homeTeamUpdate,
        awayTeamUpdate,
      ];
      const relatedBracketGame = (
        await tx
          .select({
            round: bracketGame.round,
            seed: bracketGame.seed,
            seasonId: bracketGame.seasonId,
          })
          .from(bracketGame)
          .innerJoin(season, eq(bracketGame.seasonId, season.id))
          .where(
            and(
              eq(season.leagueName, user.publicMetadata.league as string),
              eq(season.isActive, true),
              eq(bracketGame.gameId, game.id),
            ),
          )
          .limit(1)
      ).at(0);
      if (relatedBracketGame && relatedBracketGame.round > 1) {
        if (input.touchdowns[0] === input.touchdowns[1]) {
          throw new Error("Ties are not allowed in the playoffs");
        }
        const gamesInRound = Math.pow(2, relatedBracketGame.round - 1);
        const nextSeed =
          relatedBracketGame.seed > gamesInRound / 2
            ? gamesInRound - relatedBracketGame.seed + 1
            : relatedBracketGame.seed;
        const detailsId = nanoid();
        const newDetails = tx.insert(gameDetails).values({
          teamId: (input.touchdowns[0] > input.touchdowns[1]
            ? game.homeDetails
            : game.awayDetails
          ).teamId,
          id: detailsId,
        });
        const nextGame = await tx.query.bracketGame.findFirst({
          where: and(
            eq(bracketGame.round, relatedBracketGame.round - 1),
            eq(bracketGame.seed, nextSeed),
            eq(bracketGame.seasonId, relatedBracketGame.seasonId),
          ),
        });
        if (!nextGame) {
          throw new Error("Couldn't find next bracket round");
        }
        const updateNextGame = tx
          .update(dbGame)
          .set({
            [relatedBracketGame.seed <= gamesInRound / 2
              ? "homeDetailsId"
              : "awayDetailsId"]: detailsId,
          })
          .where(eq(dbGame.id, nextGame.gameId));

        allUpdates.push(newDetails, updateNextGame);
      }

      await Promise.all(allUpdates);

      return {
        homeWinnings,
        awayWinnings,
        homeFansUpdate: {
          roll: homeFansUpdate.roll,
          currentFans: homeFansUpdate.currentFans,
          newFans: homeFansUpdate.newFans,
        },
        awayFansUpdate: {
          roll: awayFansUpdate.roll,
          currentFans: awayFansUpdate.currentFans,
          newFans: awayFansUpdate.newFans,
        },
        homeMVP: { name: mvpHome.name, number: mvpHome.number },
        awayMVP: { name: mvpAway.name, number: mvpAway.number },
      };
    });
  });

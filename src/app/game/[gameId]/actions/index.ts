"use server";
import { z } from "zod";
import { action } from "utils/safe-action";
import { db } from "utils/drizzle";
import { and, eq, not, gte, inArray, sql } from "drizzle-orm";
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
} from "db/schema";
import { canEditTeam } from "app/team/[teamName]/edit/actions";
import calculateTV from "utils/calculate-tv";
import { nanoid } from "nanoid";
import { calculateInducementCosts } from "./calculate-inducement-costs";
import { getPlayerStats } from "utils/get-computed-player-fields";
import { d6 } from "utils/d6";

export const start = action(z.object({ id: z.string() }), async ({ id }) => {
  return db.transaction(async (tx) => {
    const teamDetailsOptions = {
      with: {
        team: {
          with: {
            players: {
              where: eq(player.missNextGame, false),
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
    } as const;
    const game = await tx.query.game.findFirst({
      where: eq(dbGame.id, id),
      with: {
        homeDetails: teamDetailsOptions,
        awayDetails: teamDetailsOptions,
      },
    });
    if (!game) throw new Error("Could not ifnd game");

    if (
      !canEditTeam([game.homeDetails.teamName, game.awayDetails.teamName], tx)
    )
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

    const teamUpdate = tx
      .update(dbTeam)
      .set({
        state: "playing",
      })
      .where(
        inArray(dbTeam.name, [
          game.homeDetails.team.name,
          game.awayDetails.team.name,
        ]),
      );
    const gameUpdate = tx
      .update(dbGame)
      .set({
        state: "journeymen",
        weather: weatherResult,
      })
      .where(eq(dbGame.id, game.id));
    const homeDetailsUpdate = tx
      .update(gameDetails)
      .set({
        journeymenRequired: homeJourneymen.count,
      })
      .where(eq(gameDetails.id, game.homeDetails.id));
    const awayDetailsUpdate = tx
      .update(gameDetails)
      .set({
        journeymenRequired: awayJourneymen.count,
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

export const selectJourneymen = action(
  z.object({
    home: z.string().optional(),
    away: z.string().optional(),
    game: z.string(),
  }),
  async (input) => {
    return db.transaction(async (tx) => {
      const teamFields = {
        columns: {
          name: true,
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

      if (
        !canEditTeam([game.homeDetails.team.name, game.awayDetails.team.name])
      )
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
        newPlayers.push(
          ...Array.from(Array(11 - homePlayers), (_, i) => ({
            id: nanoid(),
            number: 99 - i,
            positionId: homeChoice.id,
            membershipType: "journeyman" as const,
            teamName: game.homeDetails.teamName,
          })),
        );
      }
      if (awayChoice) {
        awayTV += awayChoice.cost * (11 - awayPlayers);
        newPlayers.push(
          ...Array.from(Array(11 - awayPlayers), (_, i) => ({
            id: nanoid(),
            number: 99 - i,
            positionId: awayChoice.id,
            membershipType: "journeyman" as const,
            teamName: game.awayDetails.teamName,
          })),
        );
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
  },
);

const inducementChoicesSchema = z.object({
  stars: z.array(z.string()).max(2),
  inducements: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().int().gt(0).default(1),
    }),
  ),
});
export const purchaseInducements = action(
  z.object({
    game: z.string(),
    home: inducementChoicesSchema,
    away: inducementChoicesSchema,
  }),
  async (input) => {
    return db.transaction(async (tx) => {
      const detailsFields = {
        columns: {
          id: true,
          pettyCashAwarded: true,
        },
        with: {
          team: {
            columns: {
              name: true,
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
      if (!game) throw new Error("Game does not exist");
      if (
        !canEditTeam(
          [game.homeDetails.team.name, game.awayDetails.team.name],
          tx,
        )
      )
        throw new Error("User does not have permission for this game");
      if (game.state !== "inducements")
        throw new Error("Game not awaiting inducements");

      const teamSpecialRules = (
        team: (typeof game)[`${"home" | "away"}Details`]["team"],
      ) => {
        const rules = team.roster.specialRuleToRoster.map(
          (r) => r.specialRuleName,
        );
        if (team.chosenSpecialRuleName) rules.push(team.chosenSpecialRuleName);
        return rules;
      };

      const [homeInducementCost, awayInducementCost] = await Promise.all(
        (["home", "away"] as const).map(async (t) =>
          calculateInducementCosts(
            input[t].inducements,
            input[t].stars,
            teamSpecialRules(game[`${t}Details`].team),
            game[`${t}Details`].team.players.length,
            tx,
          ),
        ),
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

      await Promise.all([
        tx
          .update(team)
          .set({
            treasury: sql`${team.treasury} - ${treasuryCostHome}`,
          })
          .where(eq(team.name, game.homeDetails.team.name)),
        tx
          .update(team)
          .set({
            treasury: sql`${team.treasury} - ${treasuryCostAway}`,
          })
          .where(eq(team.name, game.awayDetails.team.name)),
        tx
          .update(dbGame)
          .set({
            state: "in_progress",
          })
          .where(eq(dbGame.id, input.game)),
        (input.home.stars.length > 0 || input.away.stars.length > 0) &&
          tx.insert(gameDetailsToStarPlayer).values(
            (["home", "away"] as const).flatMap((t) =>
              input[t].stars.map((s) => ({
                starPlayerName: s,
                gameDetailsId: game[`${t}Details`].id,
              })),
            ),
          ),
        (input.home.inducements.some((i) => (i.quantity ?? 1) > 0) ||
          input.away.inducements.some((i) => (i.quantity ?? 1) > 0)) &&
          tx.insert(gameDetailsToInducement).values(
            (["home", "away"] as const).flatMap((t) =>
              input[t].inducements.map((i) => ({
                inducementName: i.name,
                count: i.quantity,
                gameDetailsId: game[`${t}Details`].id,
              })),
            ),
          ),
      ]);

      return {
        treasuryCostHome,
        treasuryCostAway,
      };
    });
  },
);

export const end = action(
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
  async (input) => {
    return db.transaction(async (tx) => {
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

      if (!canEditTeam([game.homeDetails.teamName, game.awayDetails.teamName]))
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
            mappedUpdate.teamName = null;
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
        mvpChoicesHome[Math.floor(Math.random() * mvpChoicesHome.length)].id;
      updateMap[mvpHome].mvps = sql`${player.mvps} + 1`;

      const mvpAway =
        mvpChoicesAway[Math.floor(Math.random() * mvpChoicesAway.length)].id;
      updateMap[mvpAway].mvps = sql`${player.mvps} + 1`;

      const fansUpdate = (won: boolean, currentFans: number) => {
        if (won && d6() > currentFans) return sql`${team.dedicatedFans} + 1`;
        if (!won && d6() < currentFans) return sql`${team.dedicatedFans} - 1`;
      };

      const [homeFansUpdate, awayFansUpdate] =
        input.touchdowns[0] === input.touchdowns[1]
          ? [undefined, undefined]
          : [
              fansUpdate(
                input.touchdowns[0] > input.touchdowns[1],
                game.homeDetails.team.dedicatedFans,
              ),
              fansUpdate(
                input.touchdowns[1] > input.touchdowns[0],
                game.awayDetails.team.dedicatedFans,
              ),
            ];

      const [homeWinnings, awayWinnings] = [
        input.touchdowns[0],
        input.touchdowns[1],
      ].map(
        (score) =>
          (score +
            (game.homeDetails.fanFactor + game.awayDetails.fanFactor) / 2) *
          10_000,
      );

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
          mvpId: mvpHome,
        })
        .where(eq(gameDetails.id, game.homeDetails.id));
      const awayDetailsUpdate = tx
        .update(gameDetails)
        .set({
          casualties: input.casualties[1],
          touchdowns: input.touchdowns[1],
          mvpId: mvpAway,
        })
        .where(eq(gameDetails.id, game.awayDetails.id));

      const homeTeamUpdate = tx
        .update(team)
        .set({
          state: "improving",
          dedicatedFans: homeFansUpdate,
          treasury: sql`${team.treasury} + ${homeWinnings}`,
        })
        .where(eq(team.name, game.homeDetails.teamName));
      const awayTeamUpdate = tx
        .update(team)
        .set({
          state: "improving",
          dedicatedFans: awayFansUpdate,
          treasury: sql`${team.treasury} + ${awayWinnings}`,
        })
        .where(eq(team.name, game.awayDetails.teamName));

      await Promise.all([
        Promise.all(playerUpdates),
        gameUpdate,
        homeDetailsUpdate,
        awayDetailsUpdate,
        homeTeamUpdate,
        awayTeamUpdate,
      ]);
    });
  },
);

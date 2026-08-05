import { z } from "zod";
import { createValidatedAction } from "~/app/utils/action";
import type { Route } from "./+types/game.action";
import { authContext } from "~/app/primary-layout";
import { db } from "~/app/utils/drizzle";
import { eq, inArray, sql, and } from "drizzle-orm";
import {
  weatherOpts,
  gameDetails,
  game as dbGame,
  team as dbTeam,
  player,
  improvement,
  bracketGame,
  season,
  gameDetailsToStarPlayer,
  gameDetailsToInducement,
  skill,
} from "~/db/schema";
import calculateTV from "~/app/utils/calculate-tv";
import { d6 } from "~/app/utils/d6";
import nanoid from "~/app/utils/nanoid";
import { calculateInducementCosts } from "./calculate-inducement-costs";
import { gameEvent } from "./game-events";
import {
  gameWithTeamIds,
  gameDetailsWithTeamAndPlayers,
  gameDetailsForInducements,
  gameDetailsWithTeamForEndGame,
} from "~/db/query-fragments/game.fragments";
import { getPlayerStats } from "~/app/utils/get-computed-player-fields";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start"),
    gameId: z.string(),
  }),
  z.object({
    action: z.literal("select-journeymen"),
    gameId: z.string(),
    home: z.string().optional(),
    away: z.string().optional(),
  }),
  z.object({
    action: z.literal("purchase-inducements"),
    gameId: z.string(),
    home: z.string().transform((val) => JSON.parse(val) as {
      stars: string[];
      inducements: Array<{ name: string; quantity: number }>;
    }),
    away: z.string().transform((val) => JSON.parse(val) as {
      stars: string[];
      inducements: Array<{ name: string; quantity: number }>;
    }),
  }),
  z.object({
    action: z.literal("end-game"),
    gameId: z.string(),
    events: z.string().transform((val) => JSON.parse(val) as z.infer<typeof gameEvent>[]),
    homeMvpNominees: z.string().transform((val) => {
      const parsed = JSON.parse(val) as string[];
      if (parsed.length !== 6) throw new Error("Must have exactly 6 MVP nominees");
      return parsed;
    }),
    awayMvpNominees: z.string().transform((val) => {
      const parsed = JSON.parse(val) as string[];
      if (parsed.length !== 6) throw new Error("Must have exactly 6 MVP nominees");
      return parsed;
    }),
    homeStalled: z.string().transform((val) => val === "true"),
    awayStalled: z.string().transform((val) => val === "true"),
  }),
]);

export const action = createValidatedAction(
  actionSchema,
  async (data, { context }: Route.ActionArgs) => {
    const { session } = context.get(authContext);

    // Get game and verify permissions
    const game = await db.query.game.findFirst({
      where: { id: data.gameId },
      ...gameWithTeamIds,
    });
    if (!game) throw new Error("Game not found");
    if (!game.homeDetails || !game.awayDetails)
      throw new Error("Game does not have two teams");

    // Verify team permissions (user must be on one of the teams or be admin)
    const teamIds = [game.homeDetails.team.id, game.awayDetails.team.id];
    // TODO: Add proper permission check here based on session

    switch (data.action) {
      case "start":
        return handleStart(data.gameId);
      case "select-journeymen":
        return handleSelectJourneymen(data.gameId, data.home, data.away);
      case "purchase-inducements":
        return handlePurchaseInducements(data.gameId, data.home, data.away);
      case "end-game":
        return handleEndGame(
          data.gameId,
          data.events,
          data.homeMvpNominees,
          data.awayMvpNominees,
          data.homeStalled,
          data.awayStalled,
          session,
        );
    }
  },
);

async function handleStart(gameId: string) {
  return db.transaction(async (tx) => {
    const game = await tx.query.game.findFirst({
      where: { id: gameId },
      with: {
        homeDetails: gameDetailsWithTeamAndPlayers,
        awayDetails: gameDetailsWithTeamAndPlayers,
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

    await Promise.all([
      teamUpdate,
      gameUpdate,
      homeDetailsUpdate,
      awayDetailsUpdate,
    ]);

    return { success: true, data: result };
  });
}

async function handleSelectJourneymen(
  gameId: string,
  homePositionId?: string,
  awayPositionId?: string,
) {
  return db.transaction(async (tx) => {
    const game = await tx.query.game.findFirst({
      where: { id: gameId },
      columns: {
        id: true,
        state: true,
      },
      with: {
        homeDetails: gameDetailsWithTeamAndPlayers,
        awayDetails: gameDetailsWithTeamAndPlayers,
      },
    });
    if (!game) throw new Error("Failed to find game");
    if (!game.homeDetails || !game.awayDetails)
      throw new Error("Game does not have two teams");

    if (game.state !== "journeymen")
      throw new Error("Game not awaiting journeymen choice");

    const homeChoice =
      homePositionId !== undefined
        ? game.homeDetails.team.roster.rosterSlots
            .flatMap((slot) => slot.position)
            .find((pos) => pos.id === homePositionId)
        : undefined;
    const awayChoice =
      awayPositionId !== undefined
        ? game.awayDetails.team.roster.rosterSlots
            .flatMap((slot) => slot.position)
            .find((pos) => pos.id === awayPositionId)
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
        .where(eq(dbGame.id, gameId)),
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
      success: true,
      data: {
        pettyCashHome,
        pettyCashAway,
      },
    };
  });
}

async function handlePurchaseInducements(
  gameId: string,
  homeChoices: { stars: string[]; inducements: Array<{ name: string; quantity: number }> },
  awayChoices: { stars: string[]; inducements: Array<{ name: string; quantity: number }> },
) {
  return db.transaction(async (tx) => {
    const game = await tx.query.game.findFirst({
      where: { id: gameId },
      columns: {
        id: true,
        state: true,
      },
      with: {
        homeDetails: gameDetailsForInducements,
        awayDetails: gameDetailsForInducements,
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
      homeChoices.inducements,
      homeChoices.stars,
      teamSpecialRules(game.homeDetails.team),
      game.homeDetails.team.players.length,
      game.homeDetails.team.roster.name,
      tx,
    );
    const awayInducementCost = await calculateInducementCosts(
      awayChoices.inducements,
      awayChoices.stars,
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
      typeof gameDetailsToStarPlayer.$inferInsert
    > = [];
    for (const star of homeChoices.stars) {
      starInserts.push({
        starPlayerName: star,
        gameDetailsId: game.homeDetails.id,
      });
    }
    for (const star of awayChoices.stars) {
      starInserts.push({
        starPlayerName: star,
        gameDetailsId: game.awayDetails.id,
      });
    }

    const inducementInserts: Array<
      typeof gameDetailsToInducement.$inferInsert
    > = [];
    for (const inducement of homeChoices.inducements) {
      if (inducement.quantity <= 0) continue;
      inducementInserts.push({
        inducementName: inducement.name,
        count: inducement.quantity,
        gameDetailsId: game.homeDetails.id,
      });
    }
    for (const inducement of awayChoices.inducements) {
      if (inducement.quantity <= 0) continue;
      inducementInserts.push({
        inducementName: inducement.name,
        count: inducement.quantity,
        gameDetailsId: game.awayDetails.id,
      });
    }

    await Promise.all([
      tx
        .update(dbTeam)
        .set({
          treasury: sql`${dbTeam.treasury} - ${treasuryCostHome}`,
        })
        .where(eq(dbTeam.id, game.homeDetails.team.id)),
      tx
        .update(dbTeam)
        .set({
          treasury: sql`${dbTeam.treasury} - ${treasuryCostAway}`,
        })
        .where(eq(dbTeam.id, game.awayDetails.team.id)),
      tx
        .update(dbGame)
        .set({
          state: "in_progress",
        })
        .where(eq(dbGame.id, gameId)),
      starInserts.length > 0 &&
        tx.insert(gameDetailsToStarPlayer).values(starInserts),
      inducementInserts.length > 0 &&
        tx.insert(gameDetailsToInducement).values(inducementInserts),
    ]);

    return {
      success: true,
      data: {
        treasuryCostHome,
        treasuryCostAway,
      },
    };
  });
}

async function handleEndGame(
  gameId: string,
  events: z.infer<typeof gameEvent>[],
  homeMvpNominees: string[],
  awayMvpNominees: string[],
  homeStalled: boolean,
  awayStalled: boolean,
  session: { activeOrganizationId?: string | null },
) {
  return db.transaction(async (tx) => {
    if (!session.activeOrganizationId) {
      throw new Error("No league currently active 💀");
    }
    const game = await tx.query.game.findFirst({
      where: { id: gameId },
      columns: {
        id: true,
        state: true,
      },
      with: {
        homeDetails: gameDetailsWithTeamForEndGame,
        awayDetails: gameDetailsWithTeamForEndGame,
      },
    });
    if (!game) throw new Error("Game not found");
    if (!game.homeDetails || !game.awayDetails)
      throw new Error("Game does not have two teams");

    if (game.state !== "in_progress") throw new Error("Game not in progress");

    const playerToTeamMap = new Map<string, "home" | "away">();
    for (const player of game.homeDetails.team.players) {
      playerToTeamMap.set(player.id, "home");
    }
    for (const player of game.homeDetails.gameDetailsToStarPlayer) {
      playerToTeamMap.set(player.starPlayerName, "home");
    }
    for (const player of game.awayDetails.team.players) {
      playerToTeamMap.set(player.id, "away");
    }
    for (const player of game.awayDetails.gameDetailsToStarPlayer) {
      playerToTeamMap.set(player.starPlayerName, "away");
    }

    const [touchdowns, casualties] = events.reduce(
      (acc, curr) => {
        const [touchdowns, casualties] = acc;

        if (curr.type === "touchdown") {
          const team = playerToTeamMap.get(curr.player) === "home" ? 0 : 1;
          touchdowns[team] += 1;
        }
        if (
          curr.type === "casualty" &&
          curr.injury.causedBy?.type === "player"
        ) {
          const team =
            playerToTeamMap.get(curr.injury.causedBy.player) === "home"
              ? 0
              : 1;
          casualties[team] += 1;
        }

        return acc;
      },
      [
        [0, 0],
        [0, 0],
      ],
    );

    const players = [
      ...game.homeDetails.team.players,
      ...game.awayDetails.team.players,
    ];
    const playerUpdates: Record<
      string,
      Partial<{
        touchdowns: number;
        casualties: number;
        mvps: number;
        interceptions: number;
        safeLandings: number;
        missNextGame: boolean;
        otherSPP: number;
        completions: number;
        dead: boolean;
        maInjuries: number;
        avInjuries: number;
        stInjuries: number;
        agInjuries: number;
        paInjuries: number;
        nigglingInjuries: number;
        teamId: string | null;
        membershipType: typeof player.membershipType._.data | null;
      }>
    > = Object.fromEntries(
      players.map(({ id }) => [id, { missNextGame: false }]),
    );

    const newImprovements: Array<typeof improvement.$inferInsert> = [];
    const improvementsToDelete: Array<{
      playerId: string;
      order: number;
    }> = [];

    for (const ev of events) {
      if (playerToTeamMap.get(ev.player) === undefined) {
        throw new Error("Event references a player not on any team");
      }
      switch (ev.type) {
        case "touchdown":
          if (ev.playerType === "player") {
            playerUpdates[ev.player].touchdowns =
              (playerUpdates[ev.player]?.touchdowns ?? 0) + 1;
          }
          break;
        case "completion":
          playerUpdates[ev.player].completions =
            (playerUpdates[ev.player]?.completions ?? 0) + 1;
          break;
        case "interception":
          playerUpdates[ev.player].interceptions =
            (playerUpdates[ev.player]?.interceptions ?? 0) + 1;
          break;
        case "safeLanding":
          playerUpdates[ev.player].safeLandings =
            (playerUpdates[ev.player]?.safeLandings ?? 0) + 1;
          break;
        case "otherSPP":
          playerUpdates[ev.player].otherSPP =
            (playerUpdates[ev.player]?.otherSPP ?? 0) + 1;
          break;
        case "casualty": {
          const injury = ev.injury;
          const playerUpdate = playerUpdates[ev.player];

          if (injury.type === "mng") {
            playerUpdate.missNextGame = true;
          }
          if (
            injury.type === "ma" ||
            injury.type === "st" ||
            injury.type === "ag" ||
            injury.type === "pa" ||
            injury.type === "av"
          ) {
            playerUpdate.missNextGame = true;
            playerUpdate[`${injury.type}Injuries`] =
              (playerUpdate[`${injury.type}Injuries`] ?? 0) + 1;
          }
          if (injury.type === "ni") {
            playerUpdate.missNextGame = true;
            playerUpdate.nigglingInjuries =
              (playerUpdate.nigglingInjuries ?? 0) + 1;
          }
          if (injury.type === "dead") {
            playerUpdate.teamId = null;
            playerUpdate.membershipType = null;
            playerUpdate.dead = true;
          }

          if (injury.causedBy) {
            let offenderKeywords: string[];
            const causedByPlayer = injury.causedBy.player;

            if (
              injury.causedBy.type === "player" &&
              causedByPlayer in playerUpdates
            ) {
              const offender = players.find((p) => p.id === causedByPlayer);
              if (!offender) {
                throw new Error("Offending player does not exist");
              }

              playerUpdates[causedByPlayer].casualties =
                (playerUpdates[causedByPlayer]?.casualties ?? 0) + 1;

              offenderKeywords = offender.position.keywords
                .filter((k) => k.canBeHated)
                .map((k) => k.name);
            } else {
              const offender = await tx.query.starPlayer.findFirst({
                where: { name: causedByPlayer },
                with: {
                  keywords: true,
                },
              });
              if (!offender) {
                throw new Error("Offending player does not exist");
              }
              offenderKeywords = offender.keywords
                .filter((k) => k.canBeHated)
                .map((k) => k.name);
            }

            if (injury.type !== "bh" && d6() >= 4) {
              if (!offenderKeywords.includes(injury.causedBy.hatredKeyword)) {
                throw new Error("Invalid keyword chosen for Hatred");
              }
              const hatredSkillName = `Hatred (${injury.causedBy.hatredKeyword})`;
              const existingSkill = await tx.query.skill.findFirst({
                where: { name: hatredSkillName },
              });
              if (!existingSkill) {
                const baseHatredSkill = await tx.query.skill.findFirst({
                  where: { name: "Hatred" },
                });
                if (!baseHatredSkill) {
                  throw new Error("Failed to find Hatred skill");
                }
                await tx.insert(skill).values({
                  ...baseHatredSkill,
                  name: hatredSkillName,
                });
              }
              const fetchedPlayer = players.find((p) => p.id === ev.player);
              if (!fetchedPlayer) {
                throw new Error("Injured player does not exist");
              }
              const nextNegativeOrder =
                Math.min(
                  0,
                  ...fetchedPlayer.improvements.map((i) => i.order),
                ) - 1;

              newImprovements.push({
                playerId: ev.player,
                type: "automatic_skill",
                order: nextNegativeOrder,
                skillName: hatredSkillName,
              });
            }
          }

          break;
        }
      }
    }

    const eligibleHome = game.homeDetails.team.players
      .filter((p) => !p.missNextGame && !playerUpdates[p.id]?.dead)
      .map((p) => p.id);
    const eligibleAway = game.awayDetails.team.players
      .filter((p) => !p.missNextGame && !playerUpdates[p.id]?.dead)
      .map((p) => p.id);

    if (!homeMvpNominees.every((id) => eligibleHome.includes(id))) {
      throw new Error("Invalid MVP nominee for home team");
    }
    if (!awayMvpNominees.every((id) => eligibleAway.includes(id))) {
      throw new Error("Invalid MVP nominee for away team");
    }

    const mvpHomeId =
      homeMvpNominees[
        Math.floor(Math.random() * homeMvpNominees.length)
      ];
    const mvpHome = game.homeDetails.team.players.find(
      (p) => p.id === mvpHomeId,
    )!;
    playerUpdates[mvpHome.id].mvps =
      (playerUpdates[mvpHome.id].mvps ?? 0) + 1;

    const mvpAwayId =
      awayMvpNominees[
        Math.floor(Math.random() * awayMvpNominees.length)
      ];
    const mvpAway = game.awayDetails.team.players.find(
      (p) => p.id === mvpAwayId,
    )!;
    playerUpdates[mvpAway.id].mvps =
      (playerUpdates[mvpAway.id].mvps ?? 0) + 1;

    const fansUpdate = (
      wlt: "won" | "lost" | "tied",
      currentFans: number,
    ) => {
      const roll = d6();
      let newFans = currentFans;
      let updateSql: ReturnType<typeof sql> | undefined = undefined;
      if (wlt === "won" && roll > currentFans) {
        newFans += 1;
        updateSql = sql`${dbTeam.dedicatedFans} + 1`;
      } else if (wlt === "lost" && roll < currentFans) {
        newFans -= 1;
        updateSql = sql`${dbTeam.dedicatedFans} - 1`;
      }
      return {
        roll,
        currentFans,
        newFans,
        sql: updateSql,
      };
    };

    function wlt(myScore: number, yourScore: number) {
      if (myScore > yourScore) return "won";
      if (yourScore > myScore) return "lost";
      return "tied";
    }

    const [homeFansUpdate, awayFansUpdate] = [
      fansUpdate(
        wlt(touchdowns[0], touchdowns[1]),
        game.homeDetails.team.dedicatedFans,
      ),
      fansUpdate(
        wlt(touchdowns[1], touchdowns[0]),
        game.awayDetails.team.dedicatedFans,
      ),
    ];

    const sharedWinnings =
      ((game.homeDetails.fanFactor + game.awayDetails.fanFactor) / 2) *
      10_000;
    const homeWinnings =
      touchdowns[0] * 10_000 +
      sharedWinnings +
      (!homeStalled ? 10_000 : 0);
    const awayWinnings =
      touchdowns[1] * 10_000 +
      sharedWinnings +
      (!awayStalled ? 10_000 : 0);

    const playerUpdateQueries = Object.entries(playerUpdates).map(
      ([id, update]) =>
        tx
          .update(player)
          .set({
            touchdowns:
              update.touchdowns &&
              sql`${player.touchdowns} + ${update.touchdowns}`,
            casualties:
              update.casualties &&
              sql`${player.casualties} + ${update.casualties}`,
            mvps: update.mvps && sql`${player.mvps} + ${update.mvps}`,
            interceptions:
              update.interceptions &&
              sql`${player.interceptions} + ${update.interceptions}`,
            safeLandings:
              update.safeLandings &&
              sql`${player.safeLandings} + ${update.safeLandings}`,
            otherSPP:
              update.otherSPP && sql`${player.otherSPP} + ${update.otherSPP}`,
            completions:
              update.completions &&
              sql`${player.completions} + ${update.completions}`,
            missNextGame: update.missNextGame,
            dead: update.dead,
            maInjuries:
              update.maInjuries &&
              sql`${player.maInjuries} + ${update.maInjuries}`,
            avInjuries:
              update.avInjuries &&
              sql`${player.avInjuries} + ${update.avInjuries}`,
            stInjuries:
              update.stInjuries &&
              sql`${player.stInjuries} + ${update.stInjuries}`,
            agInjuries:
              update.agInjuries &&
              sql`${player.agInjuries} + ${update.agInjuries}`,
            paInjuries:
              update.paInjuries &&
              sql`${player.paInjuries} + ${update.paInjuries}`,
            nigglingInjuries:
              update.nigglingInjuries &&
              sql`${player.nigglingInjuries} + ${update.nigglingInjuries}`,
            teamId: update.teamId,
            membershipType: update.membershipType,
          })
          .where(eq(player.id, id)),
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
        casualties: casualties[0],
        touchdowns: touchdowns[0],
        mvpId: mvpHome.id,
      })
      .where(eq(gameDetails.id, game.homeDetails.id));
    const awayDetailsUpdate = tx
      .update(gameDetails)
      .set({
        casualties: casualties[1],
        touchdowns: touchdowns[1],
        mvpId: mvpAway.id,
      })
      .where(eq(gameDetails.id, game.awayDetails.id));

    const homeTeamUpdate = tx
      .update(dbTeam)
      .set({
        state: "improving",
        dedicatedFans: homeFansUpdate.sql,
        treasury: sql`${dbTeam.treasury} + ${homeWinnings}`,
      })
      .where(eq(dbTeam.id, game.homeDetails.teamId));
    const awayTeamUpdate = tx
      .update(dbTeam)
      .set({
        state: "improving",
        dedicatedFans: awayFansUpdate.sql,
        treasury: sql`${dbTeam.treasury} + ${awayWinnings}`,
      })
      .where(eq(dbTeam.id, game.awayDetails.teamId));

    const allUpdates: Array<Promise<any>> = [
      ...playerUpdateQueries,
      gameUpdate,
      homeDetailsUpdate,
      awayDetailsUpdate,
      homeTeamUpdate,
      awayTeamUpdate,
    ];
    if (newImprovements.length > 0) {
      allUpdates.push(tx.insert(improvement).values(newImprovements));
    }
    if (improvementsToDelete.length > 0) {
      allUpdates.push(
        ...improvementsToDelete.map((imp) =>
          tx
            .delete(improvement)
            .where(
              and(
                eq(improvement.playerId, imp.playerId),
                eq(improvement.order, imp.order),
              ),
            ),
        ),
      );
    }
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
            eq(season.leagueId, session.activeOrganizationId),
            eq(season.isActive, true),
            eq(bracketGame.gameId, game.id),
          ),
        )
        .limit(1)
    ).at(0);
    if (relatedBracketGame && relatedBracketGame.round > 1) {
      if (touchdowns[0] === touchdowns[1]) {
        throw new Error("Ties are not allowed in the playoffs");
      }
      const gamesInRound = Math.pow(2, relatedBracketGame.round - 1);
      const nextSeed =
        relatedBracketGame.seed > gamesInRound / 2
          ? gamesInRound - relatedBracketGame.seed + 1
          : relatedBracketGame.seed;
      const detailsId = nanoid();
      const newDetails = tx.insert(gameDetails).values({
        teamId: (touchdowns[0] > touchdowns[1]
          ? game.homeDetails
          : game.awayDetails
        ).teamId,
        id: detailsId,
      });
      const nextGame = await tx.query.bracketGame.findFirst({
        where: {
          round: relatedBracketGame.round - 1,
          seed: nextSeed,
          seasonId: relatedBracketGame.seasonId,
        },
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

    const statMinMax = {
      ma: [1, 9],
      st: [1, 8],
      ag: [1, 6],
      pa: [1, 6],
      av: [3, 11],
    };
    const updatedPlayers = await tx.query.player.findMany({
      where: { id: { in: Object.keys(playerUpdates) } },
      with: { position: true, improvements: true },
    });
    for (const updatedPlayer of updatedPlayers) {
      const updatedPlayerStats = getPlayerStats(updatedPlayer);
      for (const [stat, value] of Object.entries(updatedPlayerStats) as [
        keyof typeof updatedPlayerStats,
        number | null,
      ][]) {
        if (updatedPlayer[`${stat}Injuries`] > 2) {
          throw new Error(
            "Player cannot have any more injuries of this type",
          );
        }
        if (
          (value ?? 1) < statMinMax[stat][0] ||
          (value ?? 1) > statMinMax[stat][1]
        ) {
          throw new Error("A player's stat is now out of bounds");
        }
      }
    }

    return {
      success: true,
      data: {
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
        homeMVP: {
          name: mvpHome.name,
          number: mvpHome.number,
        },
        awayMVP: {
          name: mvpAway.name,
          number: mvpAway.number,
        },
      },
    };
  });
}

"use server";
import { eq, InferInsertModel, SQL, sql, SQLWrapper, and } from "drizzle-orm";
import { headers } from "next/headers";
import z from "zod";
import nanoid from "~/utils/nanoid";
import { auth } from "~/auth";
import {
  player,
  improvement,
  skill,
  team,
  gameDetails,
  bracketGame,
  season,
  game as dbGame,
} from "~/db/schema";
import { d6 } from "~/utils/d6";
import { db } from "~/utils/drizzle";
import { getPlayerStats } from "~/utils/get-computed-player-fields";
import { action, teamPermissionMiddleware } from "~/utils/safe-action";
import { gameEvent } from "../game-events";

export const end = action
  .inputSchema(
    z.object({
      game: z.string(),
      events: z.array(gameEvent),
      homeMvpNominees: z.array(z.string()).length(6),
      awayMvpNominees: z.array(z.string()).length(6),
      homeStalled: z.boolean(),
      awayStalled: z.boolean(),
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
    if (!game) throw new Error("Game not found");
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
      const apiSession = await auth.api.getSession({
        headers: await headers(),
      });
      if (!apiSession) throw new Error("Not authenticated");
      const { session } = apiSession;
      if (!session.activeOrganizationId) {
        throw new Error("No league currently active 💀");
      }
      const detailsFields = {
        with: {
          team: {
            with: {
              players: {
                with: {
                  position: {
                    with: {
                      keywords: true,
                    },
                  },
                  improvements: true,
                },
              },
            },
          },
          gameDetailsToStarPlayer: true,
        },
      } satisfies Parameters<typeof tx.query.gameDetails.findFirst>[0];
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

      const [touchdowns, casualties] = input.events.reduce(
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

      const newImprovements: Array<InferInsertModel<typeof improvement>> = [];
      const improvementsToDelete: Array<{
        playerId: string;
        order: number;
      }> = [];

      for (const ev of input.events) {
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

      if (!input.homeMvpNominees.every((id) => eligibleHome.includes(id))) {
        throw new Error("Invalid MVP nominee for home team");
      }
      if (!input.awayMvpNominees.every((id) => eligibleAway.includes(id))) {
        throw new Error("Invalid MVP nominee for away team");
      }

      const mvpHomeId =
        input.homeMvpNominees[
          Math.floor(Math.random() * input.homeMvpNominees.length)
        ];
      const mvpHome = game.homeDetails.team.players.find(
        (p) => p.id === mvpHomeId,
      )!;
      playerUpdates[mvpHome.id].mvps =
        (playerUpdates[mvpHome.id].mvps ?? 0) + 1;

      const mvpAwayId =
        input.awayMvpNominees[
          Math.floor(Math.random() * input.awayMvpNominees.length)
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
        let updateSql: SQL | undefined = undefined;
        if (wlt === "won" && roll > currentFans) {
          newFans += 1;
          updateSql = sql`${team.dedicatedFans} + 1`;
        } else if (wlt === "lost" && roll < currentFans) {
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
        (!input.homeStalled ? 10_000 : 0);
      const awayWinnings =
        touchdowns[1] * 10_000 +
        sharedWinnings +
        (!input.awayStalled ? 10_000 : 0);

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
      };
    });
  });

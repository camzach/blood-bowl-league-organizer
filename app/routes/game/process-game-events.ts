import { d6 } from "~/app/utils/d6";
import type { gameEvent } from "./game-events";
import type { z } from "zod";
import type { improvement, player } from "~/db/schema";

type GameEvent = z.infer<typeof gameEvent>;

type Player = {
  id: string;
  missNextGame: boolean;
  improvements: Array<typeof improvement.$inferSelect>;
  position: { keywords: Array<{ name: string; canBeHated: boolean }> };
};

type StarPlayer = {
  name: string;
  keywords: Array<{ name: string; canBeHated: boolean }>;
};

export type PlayerUpdate = Partial<{
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
}>;

export type HatredNeeded = {
  playerId: string;
  keyword: string;
  nextNegativeOrder: number;
};

export type ProcessedGameEvents = {
  touchdowns: [number, number];
  casualties: [number, number];
  playerUpdates: Record<string, PlayerUpdate>;
  hatredNeeded: HatredNeeded[];
};

export function processGameEvents(
  events: GameEvent[],
  homePlayers: Player[],
  awayPlayers: Player[],
  homeStarPlayerNames: string[],
  awayStarPlayerNames: string[],
  starPlayers: StarPlayer[],
): ProcessedGameEvents {
  const playerToTeamMap = new Map<string, "home" | "away">();
  for (const p of homePlayers) playerToTeamMap.set(p.id, "home");
  for (const name of homeStarPlayerNames) playerToTeamMap.set(name, "home");
  for (const p of awayPlayers) playerToTeamMap.set(p.id, "away");
  for (const name of awayStarPlayerNames) playerToTeamMap.set(name, "away");

  const starPlayerMap = new Map(starPlayers.map((sp) => [sp.name, sp]));

  const allPlayers = [...homePlayers, ...awayPlayers];
  const playerUpdates: Record<string, PlayerUpdate> = Object.fromEntries(
    allPlayers.map(({ id }) => [id, { missNextGame: false }]),
  );

  const touchdowns: [number, number] = [0, 0];
  const casualties: [number, number] = [0, 0];
  const hatredNeeded: HatredNeeded[] = [];

  for (const ev of events) {
    if (playerToTeamMap.get(ev.player) === undefined) {
      throw new Error("Event references a player not on any team");
    }

    switch (ev.type) {
      case "touchdown":
        if (ev.playerType === "player") {
          playerUpdates[ev.player].touchdowns =
            (playerUpdates[ev.player].touchdowns ?? 0) + 1;
        }
        touchdowns[playerToTeamMap.get(ev.player) === "home" ? 0 : 1] += 1;
        break;
      case "completion":
        playerUpdates[ev.player].completions =
          (playerUpdates[ev.player].completions ?? 0) + 1;
        break;
      case "interception":
        playerUpdates[ev.player].interceptions =
          (playerUpdates[ev.player].interceptions ?? 0) + 1;
        break;
      case "safeLanding":
        playerUpdates[ev.player].safeLandings =
          (playerUpdates[ev.player].safeLandings ?? 0) + 1;
        break;
      case "otherSPP":
        playerUpdates[ev.player].otherSPP =
          (playerUpdates[ev.player].otherSPP ?? 0) + 1;
        break;
      case "casualty": {
        const { injury } = ev;
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
          const causedByPlayer = injury.causedBy.player;
          let offenderKeywords: string[];

          if (
            injury.causedBy.type === "player" &&
            causedByPlayer in playerUpdates
          ) {
            const offender = allPlayers.find((p) => p.id === causedByPlayer);
            if (!offender) throw new Error("Offending player does not exist");
            playerUpdates[causedByPlayer].casualties =
              (playerUpdates[causedByPlayer].casualties ?? 0) + 1;
            casualties[
              playerToTeamMap.get(causedByPlayer) === "home" ? 0 : 1
            ] += 1;
            offenderKeywords = offender.position.keywords
              .filter((k) => k.canBeHated)
              .map((k) => k.name);
          } else {
            const offender = starPlayerMap.get(causedByPlayer);
            if (!offender) throw new Error("Offending player does not exist");
            offenderKeywords = offender.keywords
              .filter((k) => k.canBeHated)
              .map((k) => k.name);
          }

          if (injury.type !== "bh" && d6() >= 4) {
            if (!offenderKeywords.includes(injury.causedBy.hatredKeyword)) {
              throw new Error("Invalid keyword chosen for Hatred");
            }
            const fetchedPlayer = allPlayers.find((p) => p.id === ev.player);
            if (!fetchedPlayer)
              throw new Error("Injured player does not exist");
            const nextNegativeOrder =
              Math.min(0, ...fetchedPlayer.improvements.map((i) => i.order)) -
              1;
            hatredNeeded.push({
              playerId: ev.player,
              keyword: injury.causedBy.hatredKeyword,
              nextNegativeOrder,
            });
          }
        }
        break;
      }
    }
  }

  return { touchdowns, casualties, playerUpdates, hatredNeeded };
}

export function calculateWinnings(
  homeTDs: number,
  awayTDs: number,
  homeFanFactor: number,
  awayFanFactor: number,
  homeStalled: boolean,
  awayStalled: boolean,
): { homeWinnings: number; awayWinnings: number } {
  const sharedWinnings = ((homeFanFactor + awayFanFactor) / 2) * 10_000;
  return {
    homeWinnings:
      homeTDs * 10_000 + sharedWinnings + (!homeStalled ? 10_000 : 0),
    awayWinnings:
      awayTDs * 10_000 + sharedWinnings + (!awayStalled ? 10_000 : 0),
  };
}

"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { MutableRefObject, useMemo } from "react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import InjuryButton from "./injury-button";
import SPPButton from "./spp-button";
import TDButton from "./touchdown-button";
import { Fireworks } from "fireworks-js";
import type { end } from "../actions";
import SubmitButton from "./submit-button";
import PlayerUpdatesButton from "./player-updates-button";
import { nanoid } from "nanoid";

type BasePlayer = { id: string; name: string | null; number: number };

type Props = {
  gameId: string;
} & Record<
  "home" | "away",
  {
    id: string;
    name: string;
    rerolls: number;
    fanFactor: number;
    assistantCoaches: number;
    cheerleaders: number;
    song?: string;
    starPlayers: string[];
  } & Record<
    "players" | "journeymen",
    Array<BasePlayer & { nigglingInjuries: number }>
  >
>;

const touchdownEvent = z.object({
  type: z.literal("touchdown"),
  player: z.string(),
});
const injuryEvent = z.object({
  type: z.literal("casualty"),
  player: z.string(),
  awardedTo: z.string().optional(),
  injury: z.enum([
    "regen",
    "bh",
    "mng",
    "ni",
    "st",
    "ma",
    "ag",
    "av",
    "pa",
    "dead",
  ]),
});
const sppEvent = z.object({
  type: z.literal("spp"),
  player: z.string(),
  spp: z.enum(["completions", "deflections", "interceptions", "otherSPP"]),
});

const gameStateParser = z
  .object({
    events: z.array(
      z.intersection(
        z.discriminatedUnion("type", [touchdownEvent, injuryEvent, sppEvent]),
        z.object({ eventId: z.string() }),
      ),
    ),
  })
  .catch({ events: [] });

export type GameState = z.infer<typeof gameStateParser>;

function safeParse(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

export default function ScoreWidget({ home, away, gameId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const homeSongRef = useRef<HTMLAudioElement>(null);
  const awaySongRef = useRef<HTMLAudioElement>(null);
  const [gameState, setGameState] = useState<GameState & { game: string }>(
    () => {
      const encodedGameState = searchParams?.get("gameState") ?? "";
      return {
        game: gameId,
        ...gameStateParser.parse(
          safeParse(atob(decodeURIComponent(encodedGameState))),
        ),
      };
    },
  );

  useEffect(() => {
    const newParams = new URLSearchParams(searchParams?.toString() ?? "");
    newParams.set("gameState", btoa(JSON.stringify(gameState)));
    router.replace(`?${newParams.toString()}`);
  }, [gameState, pathname, router, searchParams]);

  const playerToTeamMap = useMemo(() => {
    const map = new Map<string, "home" | "away">();
    for (const player of [...home.players, ...home.journeymen]) {
      map.set(player.id, "home");
    }
    for (const player of home.starPlayers) {
      map.set(player, "home");
    }
    for (const player of [...away.players, ...away.journeymen]) {
      map.set(player.id, "away");
    }
    for (const player of away.starPlayers) {
      map.set(player, "away");
    }
    return map;
  }, [
    away.journeymen,
    away.players,
    away.starPlayers,
    home.journeymen,
    home.players,
    home.starPlayers,
  ]);
  const idToPlayerMap = useMemo(() => {
    const map = new Map<string, BasePlayer>();
    for (const player of [
      ...home.players,
      ...home.journeymen,
      ...home.starPlayers,
      ...away.players,
      ...away.journeymen,
      ...away.starPlayers,
    ]) {
      if (typeof player === "string") {
        // It's a star player
        map.set(player, { name: player, id: player, number: 0 });
      } else {
        // It's a regular player
        map.set(player.id, player);
      }
    }
    return map;
  }, [
    away.journeymen,
    away.players,
    away.starPlayers,
    home.journeymen,
    home.players,
    home.starPlayers,
  ]);

  const { touchdowns, casualties, playerUpdates } = gameState.events.reduce(
    (prev, ev) => {
      function mergePlayerUpdates(
        id: string,
        update: Partial<(typeof prev)["playerUpdates"][string]>,
      ) {
        if (home.starPlayers.includes(id) || away.starPlayers.includes(id)) {
          return;
        }
        prev.playerUpdates[id] ??= {};
        const prevUpdate = prev.playerUpdates[id];
        if (update.injury) {
          prevUpdate.injury = update.injury;
        }
        if (update.starPlayerPoints) {
          prevUpdate.starPlayerPoints ??= {};
          for (const [key, val] of Object.entries(update.starPlayerPoints)) {
            prevUpdate.starPlayerPoints[
              key as keyof typeof update.starPlayerPoints
            ] ??= 0;
            prevUpdate.starPlayerPoints[
              key as keyof typeof update.starPlayerPoints
            ]! += val ?? 0;
          }
        }
      }
      if (ev.type === "touchdown") {
        if (playerToTeamMap.get(ev.player) === "home") {
          prev.touchdowns[0] += 1;
        } else {
          prev.touchdowns[1] += 1;
        }
        mergePlayerUpdates(ev.player, { starPlayerPoints: { touchdowns: 1 } });
      }
      if (ev.type === "casualty") {
        if (ev.awardedTo) {
          if (
            playerToTeamMap.get(ev.awardedTo) === "home" &&
            !home.starPlayers.includes(ev.awardedTo)
          ) {
            prev.casualties[0] += 1;
          } else if (
            playerToTeamMap.get(ev.awardedTo) === "away" &&
            !away.starPlayers.includes(ev.awardedTo)
          ) {
            prev.casualties[1] += 1;
          }
          mergePlayerUpdates(ev.awardedTo, {
            starPlayerPoints: { casualties: 1 },
          });
        }
        if (ev.injury !== "bh" && ev.injury !== "regen") {
          mergePlayerUpdates(ev.player, { injury: ev.injury });
        }
      }
      if (ev.type === "spp") {
        mergePlayerUpdates(ev.player, { starPlayerPoints: { [ev.spp]: 1 } });
      }

      return prev;
    },
    {
      touchdowns: [0, 0] as [number, number],
      casualties: [0, 0] as [number, number],
      playerUpdates: {},
    } as Parameters<typeof end>[0],
  );
  function dispatchEvent<
    T extends z.infer<
      typeof touchdownEvent | typeof injuryEvent | typeof sppEvent
    >,
  >(e: T) {
    setGameState((old) => ({
      ...old,
      events: [...old.events, { ...e, eventId: nanoid() }],
    }));
  }

  const fireworksCanvas = useRef<HTMLCanvasElement>(null);
  const fireworks: MutableRefObject<Fireworks | null> = useRef(null);
  useEffect(() => {
    if (!fireworksCanvas.current) return;
    fireworks.current = new Fireworks(fireworksCanvas.current);
  }, []);

  const onTD = (team: "home" | "away", player: string): void => {
    dispatchEvent({
      type: "touchdown",
      player: player,
    });

    const fw = fireworks.current;
    fw?.start();
    const audio = team === "home" ? homeSongRef.current : awaySongRef.current;
    const otherAudio =
      team === "home" ? awaySongRef.current : homeSongRef.current;
    if (otherAudio) {
      otherAudio.pause();
      otherAudio.currentTime = 0;
    }
    if (audio) {
      audio.play().catch(() => {
        setTimeout(() => {
          fw?.stop();
        }, 5000);
      });
      audio.onended = () => {
        fw?.stop();
      };
    } else {
      setTimeout(() => fw?.stop(), 5000);
    }
    if (player === undefined) return;
  };

  return (
    <div className="col-span-2 grid grid-cols-subgrid gap-y-3">
      <div className="pointer-events-none fixed top-0 right-1/3 bottom-0 left-1/3">
        <canvas ref={fireworksCanvas} className="h-full w-full" />
      </div>

      <div className="ml-auto flex flex-col items-end gap-1 leading-10">
        <h2 className="text-3xl">{home.name}</h2>
        <span className="-mt-4 flex flex-row-reverse gap-2">
          <span>Rerolls: {home.rerolls}</span>
          <span>Coaches: {home.assistantCoaches}</span>
          <span>Cheerleaders: {home.cheerleaders}</span>
          <span>Fan Factor: {home.fanFactor}</span>
        </span>
        <span className="text-xl">
          <TDButton
            className="btn-outline btn-accent btn-sm mx-2"
            onSubmit={(player) => onTD("home", player)}
            players={home.players}
            journeymen={home.journeymen}
            stars={home.starPlayers}
          >
            +1
          </TDButton>
          Touchdowns {touchdowns[0]}
        </span>
        <span className="text-xl">
          <InjuryButton
            className="btn-outline btn-accent btn-sm mx-2"
            onSubmit={(options) =>
              dispatchEvent({
                type: "casualty",
                player: options.player,
                awardedTo: options.by,
                injury: options.injury,
              })
            }
            actors={{
              players: home.players,
              journeymen: home.journeymen,
              stars: home.starPlayers,
            }}
            targets={{
              players: away.players,
              journeymen: away.journeymen,
              stars: away.starPlayers,
            }}
          >
            +1
          </InjuryButton>
          Casualties {casualties[0]}
        </span>
        <SPPButton
          onSubmit={(player, type) => {
            dispatchEvent({
              type: "spp",
              spp: type,
              player: player.id,
            });
          }}
          players={home.players}
          journeymen={home.journeymen}
          className="btn-outline btn-accent btn-sm"
        >
          SPP
        </SPPButton>
        {home.song && <audio src={`/api/songs/${home.id}`} ref={homeSongRef} />}
      </div>
      <div className="mr-auto flex flex-col items-start gap-1 leading-10">
        <h2 className="text-3xl">{away.name}</h2>
        <span className="-mt-4 flex gap-2">
          <span>Rerolls: {away.rerolls}</span>
          <span>Coaches: {away.assistantCoaches}</span>
          <span>Cheerleaders: {away.cheerleaders}</span>
          <span>Fan Factor: {away.fanFactor}</span>
        </span>
        <span className="text-xl">
          {touchdowns[1]} Touchdowns
          <TDButton
            className="btn-outline btn-accent btn-sm mx-2"
            onSubmit={(player) => onTD("away", player)}
            players={away.players}
            journeymen={away.journeymen}
            stars={away.starPlayers}
          >
            +1
          </TDButton>
        </span>
        <span className="text-xl">
          {casualties[1]} Casualties
          <InjuryButton
            className="btn-outline btn-accent btn-sm mx-2"
            onSubmit={(options) => {
              dispatchEvent({
                type: "casualty",
                player: options.player,
                awardedTo: options.by,
                injury: options.injury,
              });
            }}
            actors={{
              players: away.players,
              journeymen: away.journeymen,
              stars: away.starPlayers,
            }}
            targets={{
              players: home.players,
              journeymen: home.journeymen,
              stars: home.starPlayers,
            }}
          >
            +1
          </InjuryButton>
        </span>
        <SPPButton
          onSubmit={(player, type) => {
            dispatchEvent({
              type: "spp",
              spp: type,
              player: player.id,
            });
          }}
          players={away.players}
          journeymen={away.journeymen}
          className="btn-outline btn-accent btn-sm"
        >
          SPP
        </SPPButton>
        {away.song && <audio src={`/api/songs/${away.id}`} ref={awaySongRef} />}
      </div>
      <div className="join col-span-2 mx-auto">
        <SubmitButton
          submission={{ game: gameId, touchdowns, casualties, playerUpdates }}
          homeTeam={home.name}
          awayTeam={away.name}
          className="btn-outline join-item"
        />
        <InjuryButton
          onSubmit={(options) =>
            dispatchEvent({
              type: "casualty",
              player: options.player,
              injury: options.injury,
            })
          }
          targets={{
            players: home.players,
            journeymen: home.journeymen,
            stars: home.starPlayers,
          }}
          className="btn btn-outline join-item"
        >
          Casualty (non-Block) (home)
        </InjuryButton>
        <InjuryButton
          onSubmit={(options) => {
            dispatchEvent({
              type: "casualty",
              player: options.player,
              injury: options.injury,
            });
          }}
          targets={{
            players: away.players,
            journeymen: away.journeymen,
            stars: away.starPlayers,
          }}
          className="btn btn-outline join-item"
        >
          Casualty (non-Block) (away)
        </InjuryButton>
        <PlayerUpdatesButton
          events={gameState.events}
          removeEvent={(eventId) =>
            setGameState((old) => ({
              ...old,
              events: old.events.filter((e) => e.eventId !== eventId),
            }))
          }
          playerMap={idToPlayerMap}
        />
      </div>
    </div>
  );
}

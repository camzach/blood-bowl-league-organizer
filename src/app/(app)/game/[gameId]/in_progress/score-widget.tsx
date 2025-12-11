"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { RefObject, useMemo } from "react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import InjuryButton from "./injury-button";
import SPPButton from "./spp-button";
import TDButton from "./touchdown-button";
import { Fireworks } from "fireworks-js";
import SubmitButton from "./submit-button";
import PlayerUpdatesButton from "./player-updates-button";
import { nanoid } from "nanoid";
import { gameEvent } from "../actions/game-events";

type BasePlayer = {
  id: string;
  name: string | null;
  number: number;
  missNextGame: boolean;
  keywords: { name: string; canBeHated: boolean }[];
};

type StarPlayer = {
  name: string;
  keywords: { name: string; canBeHated: boolean }[];
};

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
    starPlayers: StarPlayer[];
  } & Record<
    "players" | "journeymen",
    Array<BasePlayer & { nigglingInjuries: number }>
  >
>;

const gameStateParser = z
  .object({
    events: z.array(
      z.intersection(gameEvent, z.object({ eventId: z.string() })),
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
      map.set(player.name, "home");
    }
    for (const player of [...away.players, ...away.journeymen]) {
      map.set(player.id, "away");
    }
    for (const player of away.starPlayers) {
      map.set(player.name, "away");
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
      ...away.players,
      ...away.journeymen,
    ]) {
      map.set(player.id, player);
    }
    for (const player of [...home.starPlayers, ...away.starPlayers]) {
      map.set(player.name, {
        name: player.name,
        id: player.name,
        number: 0,
        missNextGame: false,
        keywords: player.keywords,
      });
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

  function dispatchEvent(e: z.infer<typeof gameEvent>) {
    setGameState((old) => ({
      ...old,
      events: [...old.events, { ...e, eventId: nanoid() }],
    }));
  }

  const fireworksCanvas = useRef<HTMLCanvasElement>(null);
  const fireworks: RefObject<Fireworks | null> = useRef(null);
  useEffect(() => {
    if (!fireworksCanvas.current) return;
    fireworks.current = new Fireworks(fireworksCanvas.current);
  }, []);

  const onTD = (
    team: "home" | "away",
    player: string,
    playerType: "player" | "star",
  ): void => {
    dispatchEvent({
      type: "touchdown",
      player: player,
      playerType,
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

  const [touchdowns, casualties] = gameState.events.reduce(
    (acc, curr) => {
      const [touchdowns, casualties] = acc;

      if (curr.type === "touchdown") {
        const team = playerToTeamMap.get(curr.player) === "home" ? 0 : 1;
        touchdowns[team] += 1;
      }
      if (curr.type === "casualty" && curr.injury.causedBy?.type === "player") {
        const team =
          playerToTeamMap.get(curr.injury.causedBy.player) === "home" ? 0 : 1;
        casualties[team] += 1;
      }

      return acc;
    },
    [
      [0, 0],
      [0, 0],
    ],
  );

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
            onSubmit={(player, type) => onTD("home", player, type)}
            players={home.players}
            journeymen={home.journeymen}
            stars={home.starPlayers.map((p) => p.name)}
          >
            +1
          </TDButton>
          Touchdowns {touchdowns[0]}
        </span>
        <span className="text-xl">
          <InjuryButton
            className="btn-outline btn-accent btn-sm mx-2"
            onSubmit={dispatchEvent}
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
          onSubmit={dispatchEvent}
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
            onSubmit={(player, type) => onTD("away", player, type)}
            players={away.players}
            journeymen={away.journeymen}
            stars={away.starPlayers.map((p) => p.name)}
          >
            +1
          </TDButton>
        </span>
        <span className="text-xl">
          {casualties[1]} Casualties
          <InjuryButton
            className="btn-outline btn-accent btn-sm mx-2"
            onSubmit={dispatchEvent}
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
          onSubmit={dispatchEvent}
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
          events={gameState.events}
          gameId={gameState.game}
          homeTeam={home}
          awayTeam={away}
          className="btn-outline join-item"
        />
        <InjuryButton
          onSubmit={dispatchEvent}
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
          onSubmit={dispatchEvent}
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

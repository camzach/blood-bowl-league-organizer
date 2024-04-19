"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { MutableRefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import InjuryButton from "./injury-button";
import SPPButton from "./spp-button";
import TDButton from "./touchdown-button";
import { Fireworks } from "fireworks-js";
import { end } from "../actions";
import type { Route } from "next";
import PopupButton from "components/popup-button";
import SubmitButton from "./submit-button";

type NameAndId = { id: string; name: string | null };
type InputType = Parameters<typeof end>[0];

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
  } & Record<
    "players" | "journeymen",
    Array<NameAndId & { number: number; nigglingInjuries: number }>
  >
>;

const gameStateParser = z
  .object({
    touchdowns: z.tuple([z.number(), z.number()]),
    casualties: z.tuple([z.number(), z.number()]),
    playerUpdates: z.record(
      z.string(),
      z.object({
        playerName: z.string().or(z.null()),
        injury: z
          .enum(["ag", "ma", "pa", "st", "av", "mng", "ni", "dead"])
          .optional(),
        starPlayerPoints: z
          .object({
            touchdowns: z.number().optional(),
            completions: z.number().optional(),
            deflections: z.number().optional(),
            interceptions: z.number().optional(),
            casualties: z.number().optional(),
            otherSPP: z.number().optional(),
          })
          .optional(),
      }),
    ),
  })
  .catch({ touchdowns: [0, 0], casualties: [0, 0], playerUpdates: {} });

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
    router.replace(`${pathname}?${newParams.toString()}` as Route);
  }, [gameState, pathname, router, searchParams]);

  const { touchdowns, casualties, playerUpdates } = gameState;
  const setTouchdowns = (update: InputType["touchdowns"]): void => {
    setGameState((o) => ({ ...o, touchdowns: update }));
  };
  const setCasualties = (update: InputType["casualties"]): void => {
    setGameState((o) => ({ ...o, casualties: update }));
  };
  const addSPP = (
    player: NameAndId,
    type: keyof NonNullable<
      NonNullable<GameState["playerUpdates"][string]>["starPlayerPoints"]
    >,
  ): void => {
    const { name: playerName, id: playerId } = player;
    setGameState((o) => ({
      ...o,
      playerUpdates: {
        ...o.playerUpdates,
        [playerId]: {
          ...(o.playerUpdates?.[playerId] ?? { playerName }),
          starPlayerPoints: {
            ...o.playerUpdates[playerId]?.starPlayerPoints,
            [type]:
              (o.playerUpdates[playerId]?.starPlayerPoints?.[type] ?? 0) + 1,
          },
        },
      },
    }));
  };
  const addInjury = (
    player: NameAndId,
    type: NonNullable<
      NonNullable<GameState["playerUpdates"][number]>["injury"]
    >,
  ): void => {
    const { name: playerName, id: playerId } = player;
    setGameState((o) => ({
      ...o,
      playerUpdates: {
        ...o.playerUpdates,
        [playerId]: {
          ...(o.playerUpdates[playerId] ?? { playerName }),
          injury: type,
        },
      },
    }));
  };

  const fireworksCanvas = useRef<HTMLCanvasElement>(null);
  const fireworks: MutableRefObject<Fireworks | null> = useRef(null);
  useEffect(() => {
    if (!fireworksCanvas.current) return;
    fireworks.current = new Fireworks(fireworksCanvas.current);
  }, []);

  const onTD = (team: "home" | "away", player?: NameAndId): void => {
    setTouchdowns([
      team === "home" ? touchdowns[0] + 1 : touchdowns[0],
      team === "away" ? touchdowns[1] + 1 : touchdowns[1],
    ]);

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
    addSPP(player, "touchdowns");
  };

  const onInjury = (
    team: "home" | "away" | "neither",
    options: {
      by?: NameAndId;
      player: NameAndId;
      injury: NonNullable<
        NonNullable<GameState["playerUpdates"][string]>["injury"] | "bh"
      >;
    },
  ): void => {
    if (team !== "neither") {
      setCasualties([
        team === "home" ? casualties[0] + 1 : casualties[0],
        team === "away" ? casualties[1] + 1 : casualties[1],
      ]);
    }
    if (options.injury !== "bh") addInjury(options.player, options.injury);
    if (options.by !== undefined) addSPP(options.by, "casualties");
  };

  return (
    <div className="col-span-2 grid grid-cols-subgrid gap-y-3">
      <div className="pointer-events-none fixed bottom-0 left-1/3 right-1/3 top-0">
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
          >
            +1
          </TDButton>
          Touchdowns {touchdowns[0]}
        </span>
        <span className="text-xl">
          <InjuryButton
            className="btn-outline btn-accent btn-sm mx-2"
            onSubmit={(options) => {
              onInjury("home", options);
            }}
            actors={{ players: home.players, journeymen: home.journeymen }}
            targets={{ players: away.players, journeymen: away.journeymen }}
          >
            +1
          </InjuryButton>
          Casualties {casualties[0]}
        </span>
        <SPPButton
          onSubmit={addSPP}
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
          >
            +1
          </TDButton>
        </span>
        <span className="text-xl">
          {casualties[1]} Casualties
          <InjuryButton
            className="btn-outline btn-accent btn-sm mx-2"
            onSubmit={(options) => {
              onInjury("away", options);
            }}
            actors={{ players: away.players, journeymen: away.journeymen }}
            targets={{ players: home.players, journeymen: home.journeymen }}
          >
            +1
          </InjuryButton>
        </span>
        <SPPButton
          onSubmit={addSPP}
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
          gameState={gameState}
          homeTeam={home.name}
          awayTeam={away.name}
          className="btn-outline join-item"
        />
        <InjuryButton
          onSubmit={(options) => {
            onInjury("neither", options);
          }}
          targets={{
            players: home.players,
            journeymen: home.journeymen,
          }}
          className="btn btn-outline join-item"
        >
          Neutral Casualty (home)
        </InjuryButton>
        <InjuryButton
          onSubmit={(options) => {
            onInjury("neither", options);
          }}
          targets={{
            players: away.players,
            journeymen: away.journeymen,
          }}
          className="btn btn-outline join-item"
        >
          Neutral Casualty (away)
        </InjuryButton>
        <PopupButton
          className="btn-outline join-item"
          buttonText="Player Updates"
        >
          <table className="table table-zebra table-xs">
            <thead>
              <tr>
                <th>Player</th>
                <th>TD</th>
                <th>CAS</th>
                <th>COMP</th>
                <th>DEF</th>
                <th>INT</th>
                <th>ETC</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(playerUpdates).map(([id, player]) => (
                <tr key={id}>
                  <td>{player.playerName}</td>
                  <td>{player.starPlayerPoints?.touchdowns ?? "-"}</td>
                  <td>{player.starPlayerPoints?.casualties ?? "-"}</td>
                  <td>{player.starPlayerPoints?.completions ?? "-"}</td>
                  <td>{player.starPlayerPoints?.deflections ?? "-"}</td>
                  <td>{player.starPlayerPoints?.interceptions ?? "-"}</td>
                  <td>{player.starPlayerPoints?.otherSPP ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PopupButton>
      </div>
    </div>
  );
}

"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Fragment, MutableRefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import InjuryButton from "./injury-button";
import SPPButton from "./spp-button";
import TDButton from "./touchdown-button";
import { Fireworks } from "fireworks-js";
import { Modal } from "components/modal";
import { end } from "../actions";
import useRefreshingAction from "utils/use-refreshing-action";

type NameAndId = { id: string; name: string | null };
type InputType = Parameters<typeof end>[0];

type Props = {
  gameId: string;
} & Record<
  "home" | "away",
  { name: string; song?: string } & Record<
    "players" | "journeymen",
    Array<NameAndId & { number: number }>
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

type GameState = z.infer<typeof gameStateParser>;

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
    router.replace(`${pathname}?${newParams.toString()}`);
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
    <div className="relative flex w-full flex-col text-center">
      <canvas
        ref={fireworksCanvas}
        className="pointer-events-none absolute h-[500px] w-full"
      />
      <div className="flex flex-col">
        <span className="text-lg">Touchdowns</span>
        <span>
          {touchdowns[0]} - {touchdowns[1]}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-lg">Casualties</span>
        <span>
          {casualties[0]} - {casualties[1]}
        </span>
      </div>
      <div className="flex">
        {(
          [
            [home, "home", homeSongRef],
            [away, "away", awaySongRef],
          ] as const
        ).map(([team, homeOrAway, songRef]) => (
          <Fragment key={team.name}>
            <TDButton
              team={team.name}
              {...team}
              onSubmit={(player): void => {
                onTD(homeOrAway, player);
              }}
              className="flex-1"
            />
            {team.song && (
              <audio src={`/api/songs/${team.name}`} ref={songRef} />
            )}
          </Fragment>
        ))}
      </div>
      <InjuryButton onSubmit={onInjury} home={home} away={away} />
      <SPPButton onSubmit={addSPP} home={home} away={away} />
      <SubmitButton gameState={gameState} />
      <PlayerUpdatesDialog playerUpdates={playerUpdates} />
    </div>
  );
}

type SubmitButtonProps = {
  gameState: GameState & { game: string };
};
function SubmitButton({ gameState }: SubmitButtonProps) {
  const { execute, status } = useRefreshingAction(end);

  if (status === "executing") return <span>Submitting...</span>;
  if (status === "hasErrored") {
    return (
      <>
        There was an error with your submission.
        <br />
        Click{" "}
        <a
          href="#"
          onClick={(): void => {
            void navigator.clipboard.writeText(JSON.stringify(gameState));
          }}
        >
          here
        </a>{" "}
        to copy your submission parameters.
      </>
    );
  }
  if (status === "hasSucceeded") return <span>Success! Good game!</span>;
  return (
    <button className="btn" onClick={() => execute(gameState)}>
      Done
    </button>
  );
}

type PlayerUpdatesDialogProps = {
  playerUpdates: GameState["playerUpdates"];
};
function PlayerUpdatesDialog({ playerUpdates }: PlayerUpdatesDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="fixed bottom-2 right-2">
      <button className="btn" onClick={() => setIsOpen(true)}>
        Show player updates
      </button>
      <Modal isOpen={isOpen} onRequestClose={() => setIsOpen(false)}>
        <pre className="text-left">
          {JSON.stringify(playerUpdates, null, 2)}
        </pre>
      </Modal>
    </div>
  );
}

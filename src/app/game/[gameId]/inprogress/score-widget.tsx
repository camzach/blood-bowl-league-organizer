'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { MutableRefObject, ReactElement, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { ProcedureInputs } from 'utils/trpc';
import { trpc } from 'utils/trpc';
import useServerMutation from 'utils/use-server-mutation';
import { z } from 'zod';
import InjuryButton from './injury-button';
import SPPButton from './spp-button';
import TDButton from './touchdown-button';
import { Fireworks } from 'fireworks-js';
import { getSession } from 'next-auth/react';
import Button from 'components/button';

type NameAndId = { id: string; name: string | null };
type InputType = ProcedureInputs<'game', 'end'>;

type Props = {
  gameId: string;
} & Record<'home' | 'away',
{ name: string; song?: string } & Record<'players' | 'journeymen',
Array<NameAndId & { number: number }>>>;

const gameStateParser = z.object({
  touchdowns: z.tuple([z.number(), z.number()]),
  casualties: z.tuple([z.number(), z.number()]),
  playerUpdates: z.record(z.string(), z.object({
    playerName: z.string().or(z.null()),
    injury: z.enum(['AG', 'MA', 'PA', 'ST', 'AV', 'MNG', 'NI', 'DEAD']).optional(),
    starPlayerPoints: z.object({
      touchdowns: z.number().optional(),
      completions: z.number().optional(),
      deflections: z.number().optional(),
      interceptions: z.number().optional(),
      casualties: z.number().optional(),
      otherSPP: z.number().optional(),
    }).optional(),
  })),
}).catch({ touchdowns: [0, 0], casualties: [0, 0], playerUpdates: {} });

type PlayerUpdates = Partial<z.infer<typeof gameStateParser>['playerUpdates']>;
type GameState = Omit<z.infer<typeof gameStateParser>, 'playerUpdates'> & { playerUpdates: PlayerUpdates };

function safeParse(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

export default function ScoreWidget({ home, away, gameId }: Props): ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [gameState, setGameState] = useState<GameState & { game: string }>(() => {
    const encodedGameState = searchParams?.get('gameState') ?? '';
    return {
      game: gameId,
      ...gameStateParser.parse(safeParse(atob(decodeURIComponent(encodedGameState)))),
    };
  });

  useEffect(() => {
    const newParams = new URLSearchParams(searchParams ?? '');
    newParams.set('gameState', btoa(JSON.stringify(gameState)));
    router.replace(`${pathname}?${newParams.toString()}`);
  }, [gameState, pathname, router, searchParams]);

  useEffect(() => {
    let timeout: number | null = null;
    const checkSession = async() => {
      const session = await getSession();
      if (!session) return;
      const time = Math.max(0, (new Date(session.expires).getTime() - Date.now()) * 0.75);
      timeout = window.setTimeout(() => {
        void checkSession();
      }, time);
    };
    void checkSession();
    return () => {
      if (timeout !== null)
        clearTimeout(timeout);
    };
  }, []);

  const { touchdowns, casualties, playerUpdates } = gameState;
  const setTouchdowns = (update: InputType['touchdowns']): void => {
    setGameState(o => ({ ...o, touchdowns: update }));
  };
  const setCasualties = (update: InputType['casualties']): void => {
    setGameState(o => ({ ...o, casualties: update }));
  };
  const addSPP = (
    player: NameAndId,
    type: keyof NonNullable<NonNullable<GameState['playerUpdates'][string]>['starPlayerPoints']>
  ): void => {
    const { name: playerName, id: playerId } = player;
    setGameState(o => ({
      ...o,
      playerUpdates: {
        ...o.playerUpdates,
        [playerId]: {
          ...o.playerUpdates?.[playerId] ?? { playerName },
          starPlayerPoints: {
            ...o.playerUpdates[playerId]?.starPlayerPoints,
            [type]: (o.playerUpdates[playerId]?.starPlayerPoints?.[type] ?? 0) + 1,
          },
        },
      },
    }));
  };
  const addInjury = (
    player: NameAndId,
    type: NonNullable<NonNullable<GameState['playerUpdates'][number]>['injury']>
  ): void => {
    const { name: playerName, id: playerId } = player;
    setGameState(o => ({
      ...o,
      playerUpdates: {
        ...o.playerUpdates,
        [playerId]: {
          ...o.playerUpdates[playerId] ?? { playerName },
          injury: type,
        },
      },
    }));
  };
  const { startMutation, endMutation, isMutating } = useServerMutation();
  const [submissionResult, setSubmissionResult] = useState<null | 'success' | 'failure'>(null);

  const submit = (): void => {
    const [injuries, starPlayerPoints] = Object.entries(gameState.playerUpdates)
      .reduce<[InputType['injuries'], InputType['starPlayerPoints']]>((prev, curr) => {
      if (!curr[1]) return prev;
      const [prevInj, prevSPP] = prev;
      const [playerId, { injury, starPlayerPoints: currSPP }] = curr;
      if (injury !== undefined)
        prevInj.push({ playerId, injury });
      if (currSPP)
        prevSPP[playerId] = currSPP;
      return [prevInj, prevSPP];
    }, [[], {}]);
    startMutation();
    const clonedState = { ...structuredClone(gameState), playerUpdates: undefined, injuries, starPlayerPoints };
    delete clonedState.playerUpdates;
    void trpc.game.end.mutate(clonedState)
      .then(() => {
        setSubmissionResult('success');
      })
      .catch(() => {
        setSubmissionResult('failure');
      })
      .finally(endMutation);
  };

  const fireworksCanvas = useRef<HTMLCanvasElement>(null);
  const fireworks: MutableRefObject<Fireworks | null> = useRef(null);
  useEffect(() => {
    if (!fireworksCanvas.current) return;
    fireworks.current = new Fireworks(fireworksCanvas.current);
  });

  const onTD = (team: 'home' | 'away', player?: NameAndId): void => {
    setTouchdowns([
      team === 'home' ? touchdowns[0] + 1 : touchdowns[0],
      team === 'away' ? touchdowns[1] + 1 : touchdowns[1],
    ]);

    const fw = fireworks.current;
    const scoringTeam = team === 'home' ? home.name : away.name;
    fw?.start();
    const audio = new Audio(`/api/songs/${scoringTeam}`);
    void audio.play();
    audio.onended = () => {
      fw?.stop();
    };
    audio.onerror = () => {
      setTimeout(() => {
        fw?.stop();
      }, 5000);
    };
    if (player === undefined)
      return;
    addSPP(player, 'touchdowns');
  };

  const onInjury = (
    team: 'home' | 'away' | 'neither',
    options: {
      by?: NameAndId;
      player: NameAndId;
      injury: NonNullable<NonNullable<GameState['playerUpdates'][string]>['injury'] | 'BH'>;
    }
  ): void => {
    if (team !== 'neither') {
      setCasualties([
        team === 'home' ? casualties[0] + 1 : casualties[0],
        team === 'away' ? casualties[1] + 1 : casualties[1],
      ]);
    }
    if (options.injury !== 'BH')
      addInjury(options.player, options.injury);
    if (options.by !== undefined)
      addSPP(options.by, 'casualties');
  };

  return <div className="relative text-center w-full">
    <canvas
      ref={fireworksCanvas}
      className="absolute h-[500px] w-full pointer-events-none"
    />
    {touchdowns[0]} - {touchdowns[1]}
    <br/>
    <TDButton team={home.name} {...home} onSubmit={(player): void => { onTD('home', player); }} />
    <TDButton team={away.name} {...away} onSubmit={(player): void => { onTD('away', player); }} />
    <br/>
    <InjuryButton
      onSubmit={onInjury}
      home={home}
      away={away}
    />
    <br/>
    <SPPButton
      onSubmit={addSPP}
      home={home}
      away={away}
    />
    <br/>
    {((): ReactNode => {
      if (isMutating) return 'Submitting...';
      if (submissionResult === 'failure') {
        return (<>
          There was an error with your submission.
          <br/>
          Click <a href="#" onClick={(): void => {
            void navigator.clipboard.writeText(JSON.stringify(gameState));
          }}>here</a> to copy your submission parameters.
        </>);
      }
      if (submissionResult === 'success') return 'Success! Good game!';
      return <Button onClick={submit}>Done</Button>;
    })()}
    <br/>
    <pre>{JSON.stringify(playerUpdates, null, 2)}</pre>
  </div>;
}

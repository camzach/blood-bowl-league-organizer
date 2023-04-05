'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { MutableRefObject, ReactElement, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { trpc } from 'utils/trpc';
import useServerMutation from 'utils/use-server-mutation';
import { z } from 'zod';
import InjuryButton from './injury-button';
import SPPButton from './spp-button';
import TDButton from './touchdown-button';
import { Fireworks } from 'fireworks-js';

type PlayerType = { id: string; name: string | null; number: number };
type InputType = Parameters<typeof trpc.game.end.mutate>[0];

type Props = {
  gameId: string;
} & Record<'home' | 'away', { name: string; song?: string } & Record<'players' | 'journeymen', PlayerType[]>>;

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
  const [gameState, setGameState] = useState<InputType>(() => {
    const encodedGameState = searchParams?.get('gameState');
    const parser = z.object({
      touchdowns: z.tuple([z.number(), z.number()]),
      casualties: z.tuple([z.number(), z.number()]),
      injuries: z.array(z.object({
        playerId: z.string(),
        injury: z.enum(['AG', 'MA', 'PA', 'ST', 'AV', 'MNG', 'NI', 'DEAD']),
      })),
      starPlayerPoints: z.record(z.object({
        touchdowns: z.number().optional(),
        completions: z.number().optional(),
        deflections: z.number().optional(),
        interceptions: z.number().optional(),
        casualties: z.number().optional(),
        otherSPP: z.number().optional(),
      })),
    }).catch({ touchdowns: [0, 0], casualties: [0, 0], injuries: [], starPlayerPoints: {} });
    return {
      game: gameId,
      ...parser.parse(safeParse(atob(decodeURIComponent(encodedGameState ?? '')))),
    };
  });

  useEffect(() => {
    const newParams = new URLSearchParams(searchParams ?? '');
    newParams.set('gameState', btoa(JSON.stringify(gameState)));
    router.replace(`${pathname}?${newParams.toString()}`);
  }, [gameState, pathname, router, searchParams]);

  const { touchdowns, casualties, injuries, starPlayerPoints } = gameState;
  const setTouchdowns = (update: InputType['touchdowns']): void => {
    setGameState(o => ({ ...o, touchdowns: update }));
  };
  const setCasualties = (update: InputType['casualties']): void => {
    setGameState(o => ({ ...o, casualties: update }));
  };
  const setInjuries = (update: InputType['injuries']): void => {
    setGameState(o => ({ ...o, injuries: update }));
  };
  const setStarPlayerPoints = (update: InputType['starPlayerPoints']): void => {
    setGameState(o => ({ ...o, starPlayerPoints: update }));
  };
  const { startMutation, endMutation, isMutating } = useServerMutation();
  const [submissionResult, setSubmissionResult] = useState<null | 'success' | 'failure'>(null);

  const submit = (): void => {
    startMutation();
    void trpc.game.end.mutate(gameState)
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

  const onTD = (team: 'home' | 'away', player?: string): void => {
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
    setStarPlayerPoints({
      ...starPlayerPoints,
      [player]: player in starPlayerPoints
        ? { ...starPlayerPoints[player], touchdowns: (starPlayerPoints[player].touchdowns ?? 0) + 1 }
        : { touchdowns: 1 },
    });
  };

  const onInjury = (
    team: 'home' | 'away' | 'neither',
    options: { by?: string; player: string; injury: typeof injuries[number]['injury'] | 'BH' }
  ): void => {
    if (team !== 'neither') {
      setCasualties([
        team === 'home' ? touchdowns[0] + 1 : touchdowns[0],
        team === 'away' ? touchdowns[1] + 1 : touchdowns[1],
      ]);
    }
    if (options.injury !== 'BH')
      setInjuries([...injuries, { playerId: options.player, injury: options.injury }]);
    if (options.by !== undefined) {
      setStarPlayerPoints({
        ...starPlayerPoints,
        [options.by]: options.by in starPlayerPoints
          ? { ...starPlayerPoints[options.by], casualties: (starPlayerPoints[options.by].casualties ?? 0) + 1 }
          : { casualties: 1 },
      });
    }
  };

  const onSPP = (player: string, type: keyof typeof starPlayerPoints[string]): void => {
    setStarPlayerPoints({
      ...starPlayerPoints,
      [player]: player in starPlayerPoints
        ? {
          ...starPlayerPoints[player],
          [type]: (starPlayerPoints[player][type] ?? 0) + 1,
        }
        : { [type]: 1 },
    });
  };

  return <div style={{ position: 'relative' }}>
    <canvas ref={fireworksCanvas} style={{
      position: 'absolute',
      height: '500px',
      width: '50dvh',
      pointerEvents: 'none',
    }} />
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
      onSubmit={onSPP}
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
            void navigator.clipboard.writeText(JSON.stringify({
              game: gameId,
              touchdowns,
              casualties,
              injuries,
              starPlayerPoints,
            }));
          }}>here</a> to copy your submission parameters.
        </>);
      }
      if (submissionResult === 'success') return 'Success! Good game!';
      return <button onClick={submit}>Done</button>;
    })()}
    <br/>
    <pre>{JSON.stringify(injuries, null, 2)}</pre>
    =======
    <pre>{JSON.stringify(starPlayerPoints, null, 2)}</pre>
  </div>;
}

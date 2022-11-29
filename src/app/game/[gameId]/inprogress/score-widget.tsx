'use client';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { trpc } from 'utils/trpc';
import InjuryButton from './injury-button';
import TDButton from './touchdown-button';

type PlayerType = { id: string; name: string | null; number: number };
type InputType = Parameters<typeof trpc.game.end.mutate>[0];

type Props = {
  gameId: string;
} & Record<'home' | 'away', Record<'players' | 'journeymen', PlayerType[]>>;

export default function ScoreWidget({ home, away, gameId }: Props): ReactElement {
  const [touchdowns, setTouchdowns] = useState<[number, number]>([0, 0]);
  const [casualties, setCasualties] = useState<[number, number]>([0, 0]);
  const [injuries, setInjuries] = useState<InputType['injuries']>([]);
  const [starPlayerPoints, setStarPlayerPoints] = useState<InputType['starPlayerPoints']>({});

  const submit = (): void => {
    void trpc.game.end.mutate({
      game: gameId,
      touchdowns,
      casualties,
      injuries,
      starPlayerPoints,
    });
  };

  const onTD = (team: 'home' | 'away', player?: string): void => {
    setTouchdowns([
      team === 'home' ? touchdowns[0] + 1 : touchdowns[0],
      team === 'away' ? touchdowns[1] + 1 : touchdowns[1],
    ]);
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

  return <div>
    {touchdowns[0]} - {touchdowns[1]}
    <br/>
    <TDButton {...home} onSubmit={(player): void => { onTD('home', player); }} />
    <TDButton {...away} onSubmit={(player): void => { onTD('away', player); }} />
    <br/>
    <InjuryButton
      onSubmit={onInjury}
      home={home}
      away={away}
    />
    <br/>
    <button onClick={submit}>Done</button>
    <br/>
    <pre>{JSON.stringify(injuries, null, 2)}</pre>
    =======
    <pre>{JSON.stringify(starPlayerPoints, null, 2)}</pre>
  </div>;
}

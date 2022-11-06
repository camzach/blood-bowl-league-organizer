'use client';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { Die } from 'components/die';
import { trpc } from 'utils/trpc';
import Link from 'next/link';

export function PlayButton({ game }:
{ game: Awaited<ReturnType<typeof trpc.game.get.query>> & { state: 'Scheduled' } }): ReactElement {
  const [response, setResponse] = useState<Awaited<ReturnType<typeof trpc.game.start.query>> | null>(null);
  const startGame = (): void => {
    void trpc.game.start.query(game.id)
      .then(setResponse);
  };

  if (response) {
    return (
      <>
        <span style={{ fontSize: '36pt' }}>
          <Die result={response.fairweatherFansHome} size={'1em'} />
          +
          {response.fanFactorHome - response.fairweatherFansHome}
          =
          {response.fanFactorHome}
        </span>
        <br/>
        <span style={{ fontSize: '36pt' }}>
          <Die result={response.fairweatherFansAway} size={'1em'} />
          +
          {response.fanFactorAway - response.fairweatherFansAway}
          =
          {response.fanFactorAway}
        </span>
        <br/>
        <span style={{ fontSize: '36pt' }}>
          <Die result={response.weatherRoll[0]} size={'1em'} />
          <Die result={response.weatherRoll[1]} size={'1em'} />
          {'=>'}
          {response.weatherResult}
        </span>
        <br/>

        Now go to <Link href={`/game/${game.id}/journeymen`}>Journeymen</Link>
      </>
    );
  }

  return (
    <button onClick={startGame}>
      Play!!!
    </button>
  );
}

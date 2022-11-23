'use client';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { trpc } from 'utils/trpc';

export default function Journeymen({ game }:
{ game: Awaited<ReturnType<typeof trpc.game.get.query>> & { state: 'Journeymen' } }): ReactElement {
  const [homeChoice, setHomeChoice] = useState<string | undefined>(undefined);
  const [awayChoice, setAwayChoice] = useState<string | undefined>(undefined);
  const [response, setResponse] = useState<Awaited<ReturnType<typeof trpc.game.selectJourneymen.mutate>> | null>(null);

  const submitJourneymen = (): void => {
    void trpc.game.selectJourneymen.mutate({
      game: game.id,
      home: homeChoice,
      away: awayChoice,
    }).then(setResponse);
  };

  if (response !== null) {
    return <>
      Now go to <Link href={`/game/${game.id}/inducements`}>Inducements</Link>
    </>;
  }

  return (
    <>
      {game.homeChoices.count > 0 &&
        <>
          <h1>
            {game.homeTeam} - Need {game.homeChoices.count} Journeymen
          </h1>
          {game.homeChoices.choices.map(choice => (
            <label key={choice.id}>
              <input
                type="radio"
                name="home"
                value={choice.name}
                checked={homeChoice === choice.name}
                onChange={(e): void => {
                  setHomeChoice(e.target.value);
                }}
              />
              {choice.name}
            </label>
          ))}
        </>
      }
      {game.awayChoices.count > 0 &&
        <>
          <h1>
            {game.awayTeam} - Need {game.awayChoices.count} Journeymen
          </h1>
          {game.awayChoices.choices.map(choice => (
            <label key={choice.id}>
              <input
                type="radio"
                name="away"
                value={choice.name}
                checked={awayChoice === choice.name}
                onChange={(e): void => {
                  setAwayChoice(e.target.value);
                }}
              />
              {choice.name}
            </label>
          ))}
        </>
      }
      <br/>
      <button onClick={submitJourneymen}>Submit!</button>
    </>
  );
}

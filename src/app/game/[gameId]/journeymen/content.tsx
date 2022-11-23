'use client';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { trpc } from 'utils/trpc';

type TeamWithChoices = {
  name: string;
  choices: Array<{
    name: string;
    id: string;
  }>;
  needed: number;
};
type Props = {
  gameId: string;
  home: TeamWithChoices;
  away: TeamWithChoices;
};

export default function Journeymen({ home, away, gameId }: Props): ReactElement {
  const [homeChoice, setHomeChoice] = useState<string | undefined>(undefined);
  const [awayChoice, setAwayChoice] = useState<string | undefined>(undefined);
  const [response, setResponse] = useState<Awaited<ReturnType<typeof trpc.game.selectJourneymen.mutate>> | null>(null);

  const submitJourneymen = (): void => {
    void trpc.game.selectJourneymen.mutate({
      game: gameId,
      home: homeChoice,
      away: awayChoice,
    }).then(setResponse);
  };

  if (response !== null) {
    return <>
      Now go to <Link href={`/game/${gameId}/inducements`}>Inducements</Link>
    </>;
  }

  return (
    <>
      {home.needed > 0 &&
        <>
          <h1>
            {home.name} - Need {home.needed} Journeymen
          </h1>
          {home.choices.map(choice => (
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
      {away.needed > 0 &&
        <>
          <h1>
            {away.name} - Need {away.needed} Journeymen
          </h1>
          {away.choices.map(choice => (
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

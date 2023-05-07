'use client';
import Button from 'components/button';
import Link from 'components/link';
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

function ChoicesList(props: {
  teamName: string; needed: number;
  onSelect: (choice: string) => void;
  value?: string;
  choices: Array<{ id: string; name: string }>;
}) {
  const { teamName, needed, onSelect, value, choices } = props;
  return <>
    <h1>
      {teamName} - Need {needed} Journeymen
    </h1>
    {choices.map(choice => (
      <label key={choice.id}>
        <input
          type="radio"
          name={teamName}
          value={choice.name}
          checked={value === choice.name}
          className="mr-2"
          onChange={(e): void => {
            onSelect(e.target.value);
          }}
        />
        {choice.name}
      </label>
    ))}
  </>;
}

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
        <ChoicesList
          teamName={home.name}
          needed={home.needed}
          value={homeChoice}
          choices={home.choices}
          onSelect={setHomeChoice}
        />
      }
      {away.needed > 0 &&
        <ChoicesList
          teamName={away.name}
          needed={away.needed}
          value={awayChoice}
          choices={away.choices}
          onSelect={setAwayChoice}
        />
      }
      <br/>
      <Button onClick={submitJourneymen}>Submit!</Button>
    </>
  );
}

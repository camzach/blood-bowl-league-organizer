"use client";
import { useState } from "react";
import { selectJourneymen } from "../actions";
import { useRouter } from "next/navigation";

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
  teamName: string;
  needed: number;
  onSelect: (choice: string) => void;
  value?: string;
  choices: Array<{ id: string; name: string }>;
}) {
  const { teamName, needed, onSelect, value, choices } = props;
  return (
    <>
      <h1>
        {teamName} - Need {needed} Journeymen
      </h1>
      {choices.map((choice) => (
        <label key={choice.id}>
          <input
            type="radio"
            name={teamName}
            value={choice.id}
            checked={value === choice.id}
            className="mr-2"
            onChange={(e): void => {
              onSelect(e.target.value);
            }}
          />
          {choice.name}
        </label>
      ))}
    </>
  );
}

export default function Journeymen({ home, away, gameId }: Props) {
  const [homeChoice, setHomeChoice] = useState<string | undefined>(undefined);
  const [awayChoice, setAwayChoice] = useState<string | undefined>(undefined);
  const router = useRouter();

  return (
    <>
      {home.needed > 0 && (
        <ChoicesList
          teamName={home.name}
          needed={home.needed}
          value={homeChoice}
          choices={home.choices}
          onSelect={setHomeChoice}
        />
      )}
      {away.needed > 0 && (
        <ChoicesList
          teamName={away.name}
          needed={away.needed}
          value={awayChoice}
          choices={away.choices}
          onSelect={setAwayChoice}
        />
      )}
      <br />
      <button
        className="btn"
        onClick={async () => {
          await selectJourneymen({
            game: gameId,
            home: homeChoice,
            away: awayChoice,
          });
          router.replace(`/game/${gameId}/inducements`);
        }}
      >
        Submit!
      </button>
    </>
  );
}

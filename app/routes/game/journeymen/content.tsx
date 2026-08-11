"use client";
import { useEffect, useState } from "react";
import { useFetcher, useNavigate } from "react-router";
import { useFetcherErrorNotification } from "~/app/hooks/use-fetcher-error-notification";

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
  const fetcher = useFetcher();
  const navigate = useNavigate();

  useFetcherErrorNotification(fetcher);

  const isLoading = fetcher.state !== "idle";

  const handleSubmit = () => {
    const formData = new FormData();
    formData.append("action", "select-journeymen");
    formData.append("gameId", gameId);
    if (homeChoice) formData.append("home", homeChoice);
    if (awayChoice) formData.append("away", awayChoice);

    fetcher.submit(formData, {
      action: `/game/${gameId}/action`,
      method: "post",
    });
  };

  useEffect(() => {
    // Navigate when successful - loader will handle showing correct state
    if (fetcher.data?.success) {
      navigate(`/game/${gameId}`, { replace: true });
    }
  }, [fetcher.data?.success, gameId, navigate]);

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
      <button className="btn" onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? "Submitting..." : "Submit!"}
      </button>
    </>
  );
}

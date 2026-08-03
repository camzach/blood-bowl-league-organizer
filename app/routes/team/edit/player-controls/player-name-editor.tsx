import { useState } from "react";
import { useFetcher } from "react-router";

type Props = {
  id: string;
  name: string | null;
  teamId: string;
};

export default function PlayerNameEditor({ name: playerName, id, teamId }: Props) {
  const fetcher = useFetcher();
  const [localName, setLocalName] = useState(playerName ?? "");
  
  const submitName = () => {
    if (localName === playerName || localName === "") return;
    fetcher.submit(
      { action: "info", name: localName },
      { method: "post", action: `/team/${teamId}/edit/player/${id}/update` }
    );
  };

  const isSubmitting = fetcher.state === "submitting" || fetcher.state === "loading";
  
  if (isSubmitting) return <>Updating...</>;

  return (
    <input
      className="input input-sm"
      value={localName}
      onChange={(e): void => {
        setLocalName(e.target.value);
      }}
      onBlur={submitName}
    />
  );
}

import { useFetcher } from "react-router";
import { useFetcherErrorNotification } from "~/app/hooks/use-fetcher-error-notification";

type Props = {
  id: string;
  number: number;
  teamId: string;
};

export default function PlayerNumberSelector({ id, number, teamId }: Props) {
  const fetcher = useFetcher();
  
  useFetcherErrorNotification(fetcher);
  
  const isSubmitting = fetcher.state === "submitting" || fetcher.state === "loading";

  if (isSubmitting) return <>Updating...</>;

  return (
    <select
      className="select select-bordered select-sm"
      value={number}
      onChange={(e): void => {
        fetcher.submit(
          { action: "info", number: e.target.value },
          { method: "post", action: `/team/${teamId}/edit/player/${id}/update` }
        );
      }}
    >
      {Array.from(Array(16), (_, idx) => (
        <option key={idx} value={idx + 1}>
          {idx + 1}
        </option>
      ))}
    </select>
  );
}

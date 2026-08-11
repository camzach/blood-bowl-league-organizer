import { useFetcher } from "react-router";
import { useFetcherErrorNotification } from "~/app/hooks/use-fetcher-error-notification";

type Props = {
  playerId: string;
  disabled: boolean;
  teamId: string;
};

export default function CaptainButton({ playerId, disabled, teamId }: Props) {
  const fetcher = useFetcher();
  
  useFetcherErrorNotification(fetcher);
  
  const isSubmitting = fetcher.state === "submitting" || fetcher.state === "loading";

  return (
    <button
      className="btn"
      onClick={() => {
        fetcher.submit(
          { action: "captain" },
          { method: "post", action: `/team/${teamId}/edit/player/${playerId}/update` }
        );
      }}
      disabled={disabled || isSubmitting}
    >
      Make Captain
    </button>
  );
}

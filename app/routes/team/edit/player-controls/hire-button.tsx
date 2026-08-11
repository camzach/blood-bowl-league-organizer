import { useFetcher } from "react-router";
import { useFetcherErrorNotification } from "~/app/hooks/use-fetcher-error-notification";

type Props = {
  player: string;
  number: number;
  teamId: string;
};

export default function PlayerHirer({ player, number, teamId }: Props) {
  const fetcher = useFetcher();
  
  useFetcherErrorNotification(fetcher);
  
  const isSubmitting = fetcher.state === "submitting" || fetcher.state === "loading";

  if (isSubmitting) return <>Hiring...</>;

  return (
    <button
      className="btn-bordered btn btn-primary btn-sm"
      onClick={() => {
        fetcher.submit(
          { action: "existing", player, number: number.toString() },
          { method: "post", action: `/team/${teamId}/edit/hire-player` }
        );
      }}
    >
      Hire!
    </button>
  );
}

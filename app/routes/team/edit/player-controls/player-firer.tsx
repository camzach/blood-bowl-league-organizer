import { useFetcher } from "react-router";
import { useFetcherErrorNotification } from "~/app/hooks/use-fetcher-error-notification";

type Props = {
  id: string;
  teamId: string;
  disabled: boolean;
};

export default function PlayerFirer({ id, teamId, disabled }: Props) {
  const fetcher = useFetcher();

  useFetcherErrorNotification(fetcher);

  const isSubmitting =
    fetcher.state === "submitting" || fetcher.state === "loading";

  if (isSubmitting) return <>Firing...</>;
  return (
    <button
      className="btn btn-outline btn-secondary btn-sm"
      disabled={disabled}
      title={
        disabled
          ? "A team must keep at least 11 players eligible for the next game"
          : undefined
      }
      onClick={() => {
        console.log("Sus");
        fetcher.submit(
          {},
          {
            method: "post",
            action: `/team/${teamId}/edit/player/${id}/fire`,
          },
        );
      }}
    >
      Fire!
    </button>
  );
}

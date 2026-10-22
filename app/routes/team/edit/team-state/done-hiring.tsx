import { useFetcher } from "react-router";
import { useFetcherErrorNotification } from "~/app/hooks/use-fetcher-error-notification";

type Props = {
  teamId: string;
};

export default function DoneHiringButton({ teamId }: Props) {
  const fetcher = useFetcher();

  useFetcherErrorNotification(fetcher);

  const isSubmitting =
    fetcher.state === "submitting" || fetcher.state === "loading";

  return (
    <>
      {isSubmitting ? (
        "Submitting..."
      ) : (
        <button
          className="btn btn-primary"
          onClick={() => {
            fetcher.submit(
              { action: "done-hiring" },
              { method: "post", action: `/team/${teamId}/edit/state` },
            );
          }}
        >
          Done hiring players
        </button>
      )}
    </>
  );
}

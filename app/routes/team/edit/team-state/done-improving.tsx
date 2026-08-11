import { useEffect } from "react";
import { useFetcher, useNavigate } from "react-router";
import { useFetcherErrorNotification } from "~/app/hooks/use-fetcher-error-notification";

type Props = {
  teamId: string;
  blocked: boolean;
};

export default function ReadyButton({ teamId, blocked = false }: Props) {
  const fetcher = useFetcher();
  const navigate = useNavigate();

  useFetcherErrorNotification(fetcher);

  const isSubmitting =
    fetcher.state === "submitting" || fetcher.state === "loading";

  useEffect(() => {
    // Navigate on success
    if (fetcher.data?.success) {
      navigate(`/team/${teamId}/edit`, { replace: true });
    }
  }, [fetcher.data?.success, navigate, teamId]);

  return (
    <>
      {isSubmitting ? (
        "Submitting..."
      ) : (
        <button
          className="btn btn-primary"
          disabled={blocked}
          onClick={() => {
            fetcher.submit(
              { action: "done-improving" },
              { method: "post", action: `/team/${teamId}/edit/state` },
            );
          }}
        >
          Done improving players
        </button>
      )}
    </>
  );
}

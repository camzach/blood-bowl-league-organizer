import { useFetcher } from "react-router";

type Props = {
  teamId: string;
  blocked: boolean;
};

export default function ReadyButton({ teamId, blocked = false }: Props) {
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting" || fetcher.state === "loading";

  return isSubmitting ? (
    "Submitting..."
  ) : (
    <button
      className="btn btn-primary"
      disabled={blocked}
      onClick={() => {
        fetcher.submit(
          { action: "done-improving" },
          { method: "post", action: `/team/${teamId}/edit/state` }
        );
      }}
    >
      Done improving players
    </button>
  );
}

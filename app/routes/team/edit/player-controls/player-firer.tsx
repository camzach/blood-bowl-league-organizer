import { useFetcher } from "react-router";

type Props = {
  id: string;
  teamId: string;
};

export default function PlayerFirer({ id, teamId }: Props) {
  const fetcher = useFetcher();
  const isSubmitting =
    fetcher.state === "submitting" || fetcher.state === "loading";

  if (isSubmitting) return <>Firing...</>;
  return (
    <button
      className="btn btn-outline btn-secondary btn-sm"
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

"use client";
import { Die } from "~/app/components/die";
import { Link, useFetcher } from "react-router";
import { useFetcherErrorNotification } from "~/app/hooks/use-fetcher-error-notification";

export function PlayButton({ gameId }: { gameId: string }) {
  const fetcher = useFetcher();
  
  useFetcherErrorNotification(fetcher);

  const isLoading = fetcher.state !== "idle";
  const result = fetcher.data;

  if (result?.success && result.data) {
    return (
      <>
        <span className="text-4xl">
          <Die result={result.data.fairweatherFansHome} />+
          {result.data.fanFactorHome - result.data.fairweatherFansHome}=
          {result.data.fanFactorHome}
        </span>
        <br />
        <span className="text-4xl">
          <Die result={result.data.fairweatherFansAway} />+
          {result.data.fanFactorAway - result.data.fairweatherFansAway}=
          {result.data.fanFactorAway}
        </span>
        <br />
        <span className="text-4xl">
          <Die result={result.data.weatherRoll[0]} />
          <Die result={result.data.weatherRoll[1]} />
          {"=>"}
          {result.data.weatherResult}
        </span>
        <br />
        <Link className="btn" to={`/game/${gameId}`}>
          Continue
        </Link>
      </>
    );
  }

  return (
    <button
      className="btn"
      disabled={isLoading}
      onClick={() => {
        fetcher.submit(
          { action: "start", gameId },
          {
            action: `/game/${gameId}/action`,
            method: "post",
            defaultShouldRevalidate: false,
          },
        );
      }}
    >
      {isLoading ? "Starting..." : "Play!!!"}
    </button>
  );
}

"use client";
import { Die } from "~/app/components/die";
import { Link, useFetcher } from "react-router";

export function PlayButton({ gameId }: { gameId: string }) {
  const fetcher = useFetcher();

  const isLoading = fetcher.state !== "idle";
  const result = fetcher.data;

  if (result?.success && result.data) {
    const nextStep =
      result.data.homeJourneymen.count > 0 ||
      result.data.awayJourneymen.count > 0
        ? "journeymen"
        : "inducements";
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
        <Link className="btn" to={`/game/${gameId}/${nextStep}`}>
          Next step — {nextStep}
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

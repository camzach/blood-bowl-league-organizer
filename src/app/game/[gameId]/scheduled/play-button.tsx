"use client";
import { Die } from "components/die";
import Link from "next/link";
import { start } from "../actions";
import { useAction } from "next-safe-action/hooks";

export function PlayButton({ gameId }: { gameId: string }) {
  const { execute, result, status } = useAction(start);

  if (status === "hasSucceeded" && result.data) {
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
        Now go to{" "}
        <Link className="link" href={`/game/${gameId}/journeymen`}>
          Journeymen
        </Link>
      </>
    );
  }

  return (
    <button className="btn" onClick={() => execute({ id: gameId })}>
      Play!!!
    </button>
  );
}

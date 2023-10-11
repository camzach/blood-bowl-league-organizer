"use client";
import { useState } from "react";
import { Die } from "components/die";
import Link from "next/link";
import type { start as startAction } from "../actions";

export function PlayButton({
  gameId,
  start,
}: {
  gameId: string;
  start: typeof startAction;
}) {
  const [response, setResponse] = useState<Awaited<
    ReturnType<typeof start>
  > | null>(null);
  const startGame = (): void => {
    void start({ id: gameId }).then(setResponse);
  };

  if (response) {
    return (
      <>
        <span className="text-4xl">
          <Die result={response.fairweatherFansHome} />+
          {response.fanFactorHome - response.fairweatherFansHome}=
          {response.fanFactorHome}
        </span>
        <br />
        <span className="text-4xl">
          <Die result={response.fairweatherFansAway} />+
          {response.fanFactorAway - response.fairweatherFansAway}=
          {response.fanFactorAway}
        </span>
        <br />
        <span className="text-4xl">
          <Die result={response.weatherRoll[0]} />
          <Die result={response.weatherRoll[1]} />
          {"=>"}
          {response.weatherResult}
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
    <button className="btn" onClick={startGame}>
      Play!!!
    </button>
  );
}

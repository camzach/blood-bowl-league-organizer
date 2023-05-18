"use client";
import type { ReactElement } from "react";
import { useState } from "react";
import { Die } from "components/die";
import { trpc } from "utils/trpc";
import Link from "next/link";

export function PlayButton({ gameId }: { gameId: string }): ReactElement {
  const [response, setResponse] = useState<Awaited<
    ReturnType<typeof trpc.game.start.mutate>
  > | null>(null);
  const startGame = (): void => {
    void trpc.game.start.mutate(gameId).then(setResponse);
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

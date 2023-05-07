"use client";
import type { ReactElement } from "react";
import { useState } from "react";
import { Die } from "components/die";
import { trpc } from "utils/trpc";
import Link from "components/link";
import Button from "components/button";

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
          <Die result={response.fairweatherFansHome} size={"1.5em"} />+
          {response.fanFactorHome - response.fairweatherFansHome}=
          {response.fanFactorHome}
        </span>
        <br />
        <span className="text-4xl">
          <Die result={response.fairweatherFansAway} size={"1.5em"} />+
          {response.fanFactorAway - response.fairweatherFansAway}=
          {response.fanFactorAway}
        </span>
        <br />
        <span className="text-4xl">
          <Die result={response.weatherRoll[0]} size={"1.5em"} />
          <Die result={response.weatherRoll[1]} size={"1.5em"} />
          {"=>"}
          {response.weatherResult}
        </span>
        <br />
        Now go to <Link href={`/game/${gameId}/journeymen`}>Journeymen</Link>
      </>
    );
  }

  return <Button onClick={startGame}>Play!!!</Button>;
}

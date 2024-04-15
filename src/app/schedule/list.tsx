import Link from "next/link";
import { Fragment } from "react";
import type { Metadata } from "next";
import LocalTimestamp from "./local-timestamp";
import fetchGames from "./fetch-games";

export const metadata: Metadata = { title: "Schedule" };

type Props = {
  games: Awaited<ReturnType<typeof fetchGames>>["games"];
};

export default function Schedule({ games }: Props) {
  const rounds = games.reduce<(typeof games)[]>((prev, curr) => {
    if (!(curr.round - 1 in prev)) {
      prev[curr.round - 1] = [curr];
    } else {
      prev[curr.round - 1].push(curr);
    }
    return prev;
  }, []);

  return (
    <>
      {games.length === 0 ? (
        "No games currently scheduled. Ask your league administrator when the next season begins!"
      ) : (
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Round</th>
              <th>Home</th>
              <th>Away</th>
              <th>Time</th>
              <th>TD</th>
              <th>Cas</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            {rounds.map((round, roundIdx) => (
              <Fragment key={roundIdx}>
                {round.map(
                  ({ id, homeDetails, awayDetails, time, state }, gameIdx) => (
                    <tr key={id}>
                      {gameIdx === 0 && (
                        <td rowSpan={round.length}>{roundIdx + 1}</td>
                      )}
                      <td>{homeDetails.teamName}</td>
                      <td>{awayDetails.teamName}</td>
                      <td>
                        {time ? (
                          <LocalTimestamp time={new Date(time)} />
                        ) : (
                          "Unscheduled"
                        )}
                      </td>
                      <td>
                        {homeDetails.touchdowns} - {awayDetails.touchdowns}
                      </td>
                      <td>
                        {homeDetails.casualties} - {awayDetails.casualties}
                      </td>
                      <td>
                        <Link className="link" href={`/game/${id}`}>
                          {state === "complete" ? "View Result" : "Play"}
                        </Link>
                      </td>
                    </tr>
                  ),
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

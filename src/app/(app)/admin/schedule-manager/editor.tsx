"use client";
import classNames from "classnames";
import { useState } from "react";
import DateTimePicker from "./date-time-picker";
import { isEqual } from "date-fns";
import { useAction } from "next-safe-action/hooks";
import { rescheduleGames } from "../actions";

type Game = {
  id: string;
  round: number;
  homeTeam?: string;
  awayTeam?: string;
  time: Date | null;
  newTime?: Date;
};

type Props = {
  games: Game[];
};
export default function ScheduleEditor(props: Props) {
  const [games, setGames] = useState(props.games);
  const { status, execute } = useAction(rescheduleGames);

  const blockedMap = new WeakMap<Game, boolean>();
  const blockedBy = new Map<Game, Game[]>();
  for (const game of games) {
    const time = game.newTime ?? game.time;
    const dependencies = games.filter(
      (g) =>
        g.round === game.round - 1 &&
        [game.homeTeam, game.awayTeam].some((tid) =>
          [g.homeTeam, g.awayTeam].includes(tid),
        ),
    );
    const blockers = dependencies.filter((dep) => {
      const depTime = dep.newTime ?? dep.time;
      return blockedMap.get(dep) || (time && depTime && depTime > time);
    });
    blockedMap.set(game, blockers.length > 0 || !time);
    blockedBy.set(game, blockers);
  }

  return (
    <>
      <button
        className="btn"
        onClick={() => {
          const modifiedGames = games
            .filter((g): g is typeof g & { newTime: Date } => !!g.newTime)
            .map((g) => ({ id: g.id, time: g.newTime.toISOString() }));
          execute(modifiedGames);
        }}
      >
        {
          {
            executing: "Submitting changes...",
            transitioning: "Submitting changes...",
            hasErrored: "Failed to submit",
            hasSucceeded: "Success!",
            idle: "Submit schedule changes",
            hasNavigated: "Redirecting...",
          }[status]
        }
      </button>
      <table className={classNames("table-zebra-zebra table")}>
        <thead>
          <tr>
            <th>round</th>
            <th>Home</th>
            <th>Away</th>
            <th>Date</th>
            <th>Blocked By</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game) => {
            return (
              <tr key={game.id}>
                <td>{game.round}</td>
                <td>{game.homeTeam ?? "BYE"}</td>
                <td>{game.awayTeam ?? "BYE"}</td>
                <td>
                  <DateTimePicker
                    className={classNames(
                      blockedMap.get(game) && "input-error",
                    )}
                    value={game.newTime ?? game.time ?? undefined}
                    onChange={(time) => {
                      game.newTime = time ?? null;
                      if (
                        game.time &&
                        game.newTime &&
                        isEqual(game.time, game.newTime)
                      ) {
                        game.newTime = undefined;
                      }
                      setGames([...games]);
                    }}
                  />
                </td>
                <td>
                  <ul>
                    {blockedBy.get(game)?.map((g) => (
                      <li key={g.id}>{`${g.awayTeam} @ ${g.homeTeam}`}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

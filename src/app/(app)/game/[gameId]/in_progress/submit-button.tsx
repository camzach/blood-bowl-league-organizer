"use client";
import React, { useState } from "react";
import { end } from "../actions";
import { useAction } from "next-safe-action/hooks";
import classNames from "classnames";
import { Modal } from "components/modal";
import { Die } from "components/die";

type Props = {
  submission: Parameters<typeof end>[0];
  homeTeam: string;
  awayTeam: string;
  className?: string;
};

export default function Button({
  submission,
  className,
  homeTeam,
  awayTeam,
}: Props) {
  const [open, setOpen] = useState(false);
  const { execute, status, result } = useAction(end, {
    onSuccess: () => setOpen(true),
  });
  if (status === "executing")
    return (
      <button className={classNames("btn btn-disabled", className)} disabled>
        Submitting...
      </button>
    );
  if (status === "hasErrored") {
    return (
      <button
        onClick={(): void => {
          void navigator.clipboard.writeText(JSON.stringify(submission));
        }}
        className={classNames("btn btn-error", className)}
      >
        There was an error with your submission. Click to copy your submission
        parameters.
      </button>
    );
  }
  if (status === "hasSucceeded" && result.data)
    return (
      <>
        <Modal
          isOpen={open}
          className="w-fit max-w-screen-sm"
          onRequestClose={() => setOpen(false)}
        >
          <span className="block w-full text-center text-lg">
            Post-Game Sequence
          </span>
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Team</th>
                <td>Current Fans</td>
                <td>Fans Roll</td>
                <td>New Fans</td>
                <td>Winnings</td>
                <td>MVP</td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{homeTeam}</td>
                <td className="text-right">
                  {result.data.homeFansUpdate.currentFans}{" "}
                </td>
                <td className="text-center">
                  <Die result={result.data.homeFansUpdate.roll} />
                </td>
                <td>{result.data.homeFansUpdate.newFans}</td>
                <td>{result.data.homeWinnings}</td>
                <td>
                  #{result.data.homeMVP.number}
                  {result.data.homeMVP.name && " " + result.data.homeMVP.name}
                </td>
              </tr>
              <tr>
                <td>{awayTeam}</td>
                <td className="text-right">
                  {result.data.awayFansUpdate.currentFans}
                </td>
                <td className="text-center">
                  <Die result={result.data.awayFansUpdate.roll} />
                </td>
                <td>{result.data.awayFansUpdate.newFans}</td>
                <td>{result.data.awayWinnings}</td>
                <td>
                  #{result.data.awayMVP.number}
                  {result.data.awayMVP.name && " " + result.data.awayMVP.name}
                </td>
              </tr>
            </tbody>
          </table>
        </Modal>
        <button className={classNames("btn btn-success", className)}>
          Success! Good game!
        </button>
      </>
    );
  return (
    <button
      className={classNames("btn", className)}
      onClick={() => execute(submission)}
    >
      Done
    </button>
  );
}

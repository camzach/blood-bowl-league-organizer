"use client";
import { useState } from "react";
import { end } from "../actions";
import { useAction } from "next-safe-action/hooks";
import classNames from "classnames";
import { Modal } from "~/components/modal";
import { Die } from "~/components/die";
import { EndGameModal } from "./end-game-modal";
import { gameEvent } from "../actions/game-events";
import z from "zod";

type BasePlayer = {
  id: string;
  name: string | null;
  number: number;
  missNextGame: boolean;
};
type TeamProps = {
  id: string;
  name: string;
  rerolls: number;
  fanFactor: number;
  assistantCoaches: number;
  cheerleaders: number;
  song?: string;
  players: Array<BasePlayer & { nigglingInjuries: number }>;
  journeymen: Array<BasePlayer & { nigglingInjuries: number }>;
};

type Props = {
  events: Array<z.infer<typeof gameEvent>>;
  gameId: string;
  homeTeam: TeamProps;
  awayTeam: TeamProps;
  className?: string;
};

export default function Button({
  events,
  gameId,
  className,
  homeTeam,
  awayTeam,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mvpModalOpen, setMvpModalOpen] = useState(false);
  const { execute, status, result } = useAction(end, {
    onSuccess: () => {
      setMvpModalOpen(false); // Close MVP modal
      setOpen(true); // Open post-game summary modal
    },
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
          void navigator.clipboard.writeText(JSON.stringify(events));
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
          className="w-fit max-w-(--breakpoint-sm)"
          onRequestClose={() => setOpen(false)}
        >
          <span className="block w-full text-center text-lg">
            Post-Game Sequence
          </span>
          <table className="table-sm table">
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
                <td>{homeTeam.name}</td>
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
                <td>{awayTeam.name}</td>
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
    <>
      {mvpModalOpen && (
        <EndGameModal
          isOpen={mvpModalOpen}
          onRequestClose={() => setMvpModalOpen(false)}
          homePlayers={homeTeam.players
            .concat(homeTeam.journeymen)
            .filter(
              (p) =>
                !p.missNextGame &&
                !events.some(
                  (ev) =>
                    ev.type === "casualty" &&
                    ev.player === p.id &&
                    ev.injury.type === "dead",
                ),
            )}
          awayPlayers={awayTeam.players
            .concat(awayTeam.journeymen)
            .filter(
              (p) =>
                !p.missNextGame &&
                !events.some(
                  (ev) =>
                    ev.type === "casualty" &&
                    ev.player === p.id &&
                    ev.injury.type === "dead",
                ),
            )}
          onSubmit={(homeNominees, awayNominees, homeStalled, awayStalled) => {
            execute({
              game: gameId,
              events,
              homeMvpNominees: homeNominees,
              awayMvpNominees: awayNominees,
              homeStalled,
              awayStalled,
            });
          }}
        />
      )}
      <button
        className={classNames("btn", className)}
        onClick={() => setMvpModalOpen(true)}
      >
        Done
      </button>
    </>
  );
}

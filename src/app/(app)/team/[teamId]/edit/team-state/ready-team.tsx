"use client";
import { Die } from "components/die";
import { Modal } from "components/modal";
import { useRouter } from "next/navigation";
import { ready } from "../actions";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import cx from "classnames";
import useTooltip from "components/tooltip";

type Props = {
  teamId: string;
  treasury: number;
};

const tableRows = Array.from(Array(2), (i) => <Catastrophe key={i} />)
  .concat(Array.from(Array(2), (i) => <MajorIncident key={i + 2} />))
  .concat(Array.from(Array(2), (i) => <MinorIncident key={i + 4} />))
  .concat(Array.from(Array(5), (i) => <CrisisAverted key={i + 6} />));

export default function ReadyButton({ teamId, treasury }: Props) {
  const router = useRouter();
  const { execute, result, status } = useAction(ready, {
    onSuccess() {
      if (treasury < 100000) {
        router.refresh();
      }
    },
  });
  const [warningOpen, setWarningOpen] = useState(false);
  const tableOffset = Math.min(Math.floor(treasury / 100000), 6);

  return (
    <>
      {treasury >= 100000 && status === "hasSucceeded" && result.data && (
        <Modal isOpen>
          <div className="flex flex-col">
            <Die result={result.data.expensiveMistakeRoll} />
            {result.data.expensiveMistake}
            {" - Lost "}
            {result.data.expensiveMistakesCost}
            {" gold!"}
            <button
              onClick={(): void => {
                router.refresh();
              }}
            >
              OK
            </button>
          </div>
        </Modal>
      )}
      <Modal isOpen={warningOpen} onRequestClose={() => setWarningOpen(false)}>
        <p className="mb-3">
          Warning: You have more than {tableOffset}00k in your treasury!
        </p>
        <p className="mb-3">
          You are at risk of losing money to Expensive Mistakes. Spend some more
          to reduce your risk.
        </p>
        <table className="mb-4 table [&_td]:first:text-right [&_th]:first:text-right">
          <thead>
            <tr>
              <th>Die Roll</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(Array(6), (_, i) => {
              return (
                <tr key={i}>
                  <td>
                    <Die result={i + 1} />
                  </td>
                  <td>{tableRows[i + 6 - tableOffset]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex w-full gap-4">
          <button
            className="btn btn-warning flex-1"
            onClick={() => {
              setWarningOpen(false);
              execute(teamId);
            }}
          >
            Continue Anyways
          </button>
          <button
            className="btn btn-primary flex-1"
            onClick={() => setWarningOpen(false)}
          >
            Return to Editor
          </button>
        </div>
      </Modal>
      {/* {status === "executing" ? (
        "Submitting..."
      ) : ( */}
      <button
        className={cx("btn", treasury > 100000 ? "btn-warning" : "btn-primary")}
        onClick={() => setWarningOpen(true)}
      >
        Ready for next game
      </button>
      {/* )} */}
    </>
  );
}

function CrisisAverted() {
  const [Tooltip, tooltipId] = useTooltip();
  return (
    <>
      <a data-tooltip-id={tooltipId}>
        <div className="badge badge-success">Crisis Averted</div>
      </a>
      <Tooltip>No gold lost</Tooltip>
    </>
  );
}

function MinorIncident() {
  const [Tooltip, tooltipId] = useTooltip();
  return (
    <>
      <a data-tooltip-id={tooltipId}>
        <div className="badge badge-info">Minor Incident</div>
      </a>
      <Tooltip>Lose D3 x 10,000 gold</Tooltip>
    </>
  );
}

function MajorIncident() {
  const [Tooltip, tooltipId] = useTooltip();
  return (
    <>
      <a data-tooltip-id={tooltipId}>
        <div className="badge badge-warning">Major Incident</div>
      </a>
      <Tooltip>Lose half of your treasury (rounded down)</Tooltip>
    </>
  );
}

function Catastrophe() {
  const [Tooltip, tooltipId] = useTooltip();
  return (
    <>
      <a data-tooltip-id={tooltipId}>
        <div className="badge badge-error">Catastrophe</div>
      </a>
      <Tooltip>Lose all but 2D6 x 10,000 gold</Tooltip>
    </>
  );
}

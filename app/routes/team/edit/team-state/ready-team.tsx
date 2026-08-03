import { Die } from "~/app/components/die";
import { Modal } from "~/app/components/modal";
import { useState } from "react";
import cx from "classnames";
import useTooltip from "~/app/components/tooltip";
import { useFetcher } from "react-router";

type Props = {
  teamId: string;
  treasury: number;
};

const tableRows = Array.from(Array(2), (i) => <Catastrophe key={i} />)
  .concat(Array.from(Array(2), (i) => <MajorIncident key={i + 2} />))
  .concat(Array.from(Array(2), (i) => <MinorIncident key={i + 4} />))
  .concat(Array.from(Array(5), (i) => <CrisisAverted key={i + 6} />));

export default function ReadyButton({ teamId, treasury }: Props) {
  const fetcher = useFetcher();
  const [warningOpen, setWarningOpen] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const tableOffset = Math.min(Math.floor(treasury / 100000), 6);
  
  const result = fetcher.data as { expensiveMistake: string; expensiveMistakesCost: number; expensiveMistakeRoll: number } | undefined;
  const isSubmitting = fetcher.state === "submitting" || fetcher.state === "loading";

  return (
    <>
      {treasury >= 100000 && result && showResult && (
        <Modal isOpen onRequestClose={() => setShowResult(false)}>
          <div className="flex flex-col">
            <Die result={result.expensiveMistakeRoll} />
            {result.expensiveMistake}
            {" - Lost "}
            {result.expensiveMistakesCost}
            {" gold!"}
            <button
              onClick={(): void => {
                setShowResult(false);
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
              fetcher.submit(
                { action: "ready" },
                { method: "post", action: `/team/${teamId}/edit/state` }
              );
              if (treasury >= 100000) setShowResult(true);
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
      {isSubmitting ? (
        "Submitting..."
      ) : (
        <button
          className={cx("btn", treasury > 100000 ? "btn-warning" : "btn-primary")}
          onClick={() => {
            if (treasury > 100000) {
              setWarningOpen(true);
            } else {
              fetcher.submit(
                { action: "ready" },
                { method: "post", action: `/team/${teamId}/edit/state` }
              );
            }
          }}
        >
          Ready for next game
        </button>
      )}
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

import classNames from "classnames";
import DoneImproving from "./done-improving";
import ReadyTeam from "./ready-team";

type Props = {
  state: "draft" | "improving" | "hiring";
  id: string;
};

export default function TeamState({ state, id }: Props) {
  return (
    <div className="my-2 inline-flex flex-col gap-2">
      <ol className="steps">
        {state === "draft" ? (
          <>
            <li className="step step-primary">Draft Team</li>
          </>
        ) : (
          <>
            <li className="step step-primary">Improve Players</li>
            <li
              className={classNames(
                "step",
                state === "hiring" && "step-primary",
              )}
            >
              Hire and Fire
            </li>
          </>
        )}
        <li className="step">Ready to play</li>
      </ol>

      {state === "improving" ? (
        <DoneImproving teamId={id} />
      ) : (
        <ReadyTeam teamId={id} showResult={state !== "draft"} />
      )}
    </div>
  );
}

function TimelineCheckbox({ checked = false }: { checked?: boolean }) {
  return (
    <div className="timeline-middle">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className={classNames("h-5 w-5", checked && "text-primary")}
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}

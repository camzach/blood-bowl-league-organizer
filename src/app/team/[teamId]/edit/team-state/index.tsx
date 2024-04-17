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

import classNames from "classnames";
import DoneImproving from "./done-improving";
import DoneHiring from "./done-hiring";
import ReadyTeam from "./ready-team";

type Props = {
  state: "draft" | "improving" | "hiring" | "firing";
  id: string;
  treasury: number;
  blocked: boolean;
};

export default function TeamState({
  state,
  id,
  treasury,
  blocked = false,
}: Props) {
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
                (state === "hiring" || state === "firing") && "step-primary",
              )}
            >
              Hire Players
            </li>
            <li
              className={classNames(
                "step",
                state === "firing" && "step-primary",
              )}
            >
              Fire Players
            </li>
          </>
        )}
        <li className="step">Ready to play</li>
      </ol>

      {state === "improving" ? (
        <DoneImproving teamId={id} blocked={blocked} />
      ) : state === "hiring" ? (
        <DoneHiring teamId={id} />
      ) : (
        <ReadyTeam teamId={id} treasury={state === "draft" ? 0 : treasury} />
      )}
    </div>
  );
}

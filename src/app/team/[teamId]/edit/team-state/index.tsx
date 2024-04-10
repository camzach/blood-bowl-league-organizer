import classNames from "classnames";
import DoneImproving from "./done-improving";
import ReadyTeam from "./ready-team";

type Props = {
  state: "draft" | "improving" | "hiring";
  id: string;
};

export default function TeamState({ state, id }: Props) {
  return (
    <>
      <div className="breadcrumbs">
        <ol>
          {state === "draft" ? (
            <>
              <li className="font-bold underline">Drafting</li>
            </>
          ) : (
            <>
              <li
                className={classNames(
                  state === "improving" && "font-bold underline",
                )}
              >
                Improve Players
              </li>
              <li
                className={classNames(
                  state === "hiring" && "font-bold underline",
                )}
              >
                Hire and Fire
              </li>
            </>
          )}
          <li>Ready to play</li>
        </ol>
      </div>

      {state === "improving" ? (
        <DoneImproving teamId={id} />
      ) : (
        <ReadyTeam teamId={id} showResult={state !== "draft"} />
      )}
    </>
  );
}

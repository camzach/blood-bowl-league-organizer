import { useId } from "react";
import { useSearchParams } from "react-router";

type Props = {
  teams: Array<{
    id: string;
    name: string;
  }>;
};

export default function Controls({ teams }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();

  const mode = searchParams.get("mode") ?? "calendar";
  const state = searchParams.get("state") ?? "any";
  const selected = searchParams.getAll("teamId");

  const id = useId();
  const anchorName = `--filters-anchor-${id.replace(/:/g, "")}`;

  return (
    <div className="bg-base-200 [&_input[type=checkbox]]:checkbox [&_input[type=radio]]:radio [&_label]:label [&_input]:mr-2 [&_label]:w-fit">
      <button popoverTarget={id} style={{ anchorName } as React.CSSProperties}>
        Filters
      </button>
      <div
        id={id}
        popover="auto"
        style={
          {
            positionAnchor: anchorName,
            top: "anchor(bottom)",
            left: "anchor(left)",
          } as React.CSSProperties
        }
      >
        <ul className="flex w-full flex-row lg:flex-col">
          <li className="flex-1">
            Display
            <ul>
              <li>
                <label>
                  <input
                    type="radio"
                    name="display"
                    value="calendar"
                    checked={mode === "calendar"}
                    onChange={(e) => {
                      setSearchParams(
                        (prev) => {
                          const next = new URLSearchParams(prev);
                          next.set("mode", e.target.value);
                          return next;
                        },
                        { replace: true },
                      );
                    }}
                  />
                  Calendar
                </label>
              </li>
              <li>
                <label>
                  <input
                    type="radio"
                    name="display"
                    value="list"
                    checked={mode === "list"}
                    onChange={(e) => {
                      setSearchParams(
                        (prev) => {
                          const next = new URLSearchParams(prev);
                          next.set("mode", e.target.value);
                          return next;
                        },
                        { replace: true },
                      );
                    }}
                  />
                  List
                </label>
              </li>
            </ul>
          </li>
          <li className="flex-1">
            State
            <ul>
              <li>
                <label>
                  <input
                    type="radio"
                    name="state"
                    value="completed"
                    checked={state === "completed"}
                    onChange={(e) => {
                      setSearchParams(
                        (prev) => {
                          const next = new URLSearchParams(prev);
                          next.set("state", e.target.value);
                          return next;
                        },
                        { replace: true },
                      );
                    }}
                  />
                  Completed
                </label>
              </li>
              <li>
                <label>
                  <input
                    type="radio"
                    name="state"
                    value="scheduled"
                    checked={state === "scheduled"}
                    onChange={(e) => {
                      setSearchParams(
                        (prev) => {
                          const next = new URLSearchParams(prev);
                          next.set("state", e.target.value);
                          return next;
                        },
                        { replace: true },
                      );
                    }}
                  />
                  Scheduled
                </label>
              </li>
              <li>
                <label>
                  <input
                    type="radio"
                    name="state"
                    value="any"
                    checked={state === "any"}
                    onChange={(e) => {
                      setSearchParams(
                        (prev) => {
                          const next = new URLSearchParams(prev);
                          next.set("state", e.target.value);
                          return next;
                        },
                        { replace: true },
                      );
                    }}
                  />
                  Any
                </label>
              </li>
            </ul>
          </li>
          <li className="flex-2">
            Teams
            <ul>
              {teams.map((team) => (
                <li key={team.id}>
                  <label className="text-wrap">
                    <input
                      type="checkbox"
                      checked={selected?.includes(team.id) ?? false}
                      onChange={(e) => {
                        setSearchParams(
                          (prev) => {
                            const next = new URLSearchParams(prev);
                            const newSelected = new Set(selected);
                            if (!e.target.checked) {
                              newSelected.delete(team.id);
                            } else {
                              newSelected.add(team.id);
                            }
                            next.delete("teamId");
                            for (const id of newSelected) {
                              next.append("teamId", id);
                            }
                            return next;
                          },
                          { replace: true },
                        );
                      }}
                    />
                    {team.name}
                  </label>
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </div>
    </div>
  );
}

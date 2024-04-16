"use client";

import { useRouter } from "next/navigation";

type Props = {
  teams: Array<{
    id: string;
    name: string;
  }>;
  selected?: string | string[];
  state?: string;
  mode?: string;
};

export default function Controls({
  teams,
  selected = [],
  state = "any",
  mode = "calendar",
}: Props) {
  const router = useRouter();

  return (
    <details className="collapse bg-base-200 [&_input[type=checkbox]]:checkbox [&_input[type=radio]]:radio [&_label]:label [&_input]:mr-2 [&_label]:w-fit">
      <summary className="collapse-title">Filters</summary>
      <div className="collapse-content">
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
                      const newParams = new URLSearchParams(
                        window.location.search,
                      );
                      newParams.set("mode", e.target.value);
                      router.replace(`?${newParams.toString()}`);
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
                      const newParams = new URLSearchParams(
                        window.location.search,
                      );
                      newParams.set("mode", e.target.value);
                      router.replace(`?${newParams.toString()}`);
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
                      const newParams = new URLSearchParams(
                        window.location.search,
                      );
                      newParams.set("state", e.target.value);
                      router.replace(`?${newParams.toString()}`);
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
                      const newParams = new URLSearchParams(
                        window.location.search,
                      );
                      newParams.set("state", e.target.value);
                      router.replace(`?${newParams.toString()}`);
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
                      const newParams = new URLSearchParams(
                        window.location.search,
                      );
                      newParams.set("state", e.target.value);
                      router.replace(`?${newParams.toString()}`);
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
                        const newSelected = new Set(
                          typeof selected === "string"
                            ? [selected]
                            : Array.isArray(selected)
                              ? [...selected]
                              : [],
                        );
                        if (!e.target.checked) {
                          // This isn't a drizzle query
                          // eslint-disable-next-line drizzle/enforce-delete-with-where
                          newSelected.delete(team.id);
                        } else {
                          newSelected.add(team.id);
                        }
                        const search = new URLSearchParams(
                          window.location.search,
                        );
                        // This isn't a drizzle query
                        // eslint-disable-next-line drizzle/enforce-delete-with-where
                        search.delete("teamId");
                        for (const id of newSelected) {
                          search.append("teamId", id);
                        }
                        router.replace(`?${search.toString()}`);
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
    </details>
  );
}

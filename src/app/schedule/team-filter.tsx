"use client";

import { Route } from "next";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  teams: Array<{
    id: string;
    name: string;
  }>;
  selected?: string | string[];
  state?: string;
};

export default function TeamFilter({ teams, selected, state = "any" }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <details
      tabIndex={0}
      className="collapse collapse-arrow border border-base-300 bg-base-200"
    >
      <summary className="collapse-title">Filters</summary>
      <div className="collapse-content">
        <ul>
          <li>
            State
            <ul className="ml-4 flex gap-4">
              <li>
                <label className="label">
                  <input
                    type="radio"
                    className="radio mr-2"
                    name="state"
                    value="completed"
                    checked={state === "completed"}
                    onChange={(e) => {
                      const newParams = new URLSearchParams(
                        window.location.search,
                      );
                      newParams.set("state", e.target.value);
                      router.replace(
                        `${pathname}?${newParams.toString()}` as Route,
                      );
                    }}
                  />
                  Completed
                </label>
              </li>
              <li>
                <label className="label">
                  <input
                    type="radio"
                    className="radio mr-2"
                    name="state"
                    value="scheduled"
                    checked={state === "scheduled"}
                    onChange={(e) => {
                      const newParams = new URLSearchParams(
                        window.location.search,
                      );
                      newParams.set("state", e.target.value);
                      router.replace(
                        `${pathname}?${newParams.toString()}` as Route,
                      );
                    }}
                  />
                  Scheduled
                </label>
              </li>
              <li>
                <label className="label">
                  <input
                    type="radio"
                    className="radio mr-2"
                    name="state"
                    value="any"
                    checked={state === "any"}
                    onChange={(e) => {
                      const newParams = new URLSearchParams(
                        window.location.search,
                      );
                      newParams.set("state", e.target.value);
                      router.replace(
                        `${pathname}?${newParams.toString()}` as Route,
                      );
                    }}
                  />
                  Any
                </label>
              </li>
            </ul>
          </li>
          <li>
            Teams
            <ul className="ml-4 flex gap-4">
              {teams.map((team) => (
                <label className="label" key={team.id}>
                  <input
                    type="checkbox"
                    checked={selected?.includes(team.id) ?? false}
                    className="checkbox mr-2"
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
                      router.replace(
                        `${pathname}?${search.toString()}` as Route,
                      );
                    }}
                  />
                  {team.name}
                </label>
              ))}
            </ul>
          </li>
        </ul>
      </div>
    </details>
  );
}

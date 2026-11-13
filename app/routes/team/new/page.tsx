import { useState } from "react";
import { coachToTeam, team } from "~/db/schema";
import { getColumns, eq, and } from "drizzle-orm";
import { db } from "~/app/utils/drizzle";
import RosterSelector from "./roster-selector";
import { Route } from "./+types/page";
import { authContext } from "~/app/primary-layout";
import { useFetcher } from "react-router";
import { useFetcherErrorNotification } from "~/app/hooks/use-fetcher-error-notification";

export async function loader({ context }: Route.LoaderArgs) {
  const { user } = context.get(authContext)!;

  const inactiveTeams = await db
    .select(getColumns(team))
    .from(team)
    .leftJoin(coachToTeam, eq(team.id, coachToTeam.teamId))
    .where(and(eq(coachToTeam.coachId, user.id), eq(team.state, "inactive")));

  const rosters = await db.query.roster.findMany({
    columns: { name: true, tier: true },
    with: { optionalSpecialRules: true },
    orderBy: { tier: "asc", name: "asc" },
  });

  return { inactiveTeams, rosters };
}

export default function Component({ loaderData }: Route.ComponentProps) {
  const { inactiveTeams, rosters } = loaderData;
  const createFetcher = useFetcher();
  const redraftFetcher = useFetcher();
  const [redraftTeamId, setRedraftTeamId] = useState(
    inactiveTeams[0]?.id ?? "",
  );

  useFetcherErrorNotification(createFetcher);
  useFetcherErrorNotification(redraftFetcher);

  return (
    <>
      <p>You do not have a team yet!</p>
      <br />
      <createFetcher.Form
        method="POST"
        action="/team/new/create"
        className="join flex"
      >
        <button
          className="btn btn-primary join-item"
          style={{ height: "auto" }}
          disabled={createFetcher.state !== "idle"}
        >
          Create a new team
        </button>
        <div className="join join-item join-vertical">
          <input
            aria-label="Team name"
            className="input join-item"
            placeholder="Team Name"
            name="name"
          />
          <RosterSelector rosters={rosters} />
        </div>
      </createFetcher.Form>
      {inactiveTeams.length > 0 && (
        <>
          <div className="divider">OR</div>
          <redraftFetcher.Form
            method="POST"
            action={`/team/${redraftTeamId}/edit/state`}
            className="join"
          >
            <input type="hidden" name="action" value="redraft" />
            <button
              type="submit"
              className="btn join-item"
              disabled={redraftFetcher.state !== "idle"}
            >
              Redraft an existing team
            </button>
            <select
              aria-label="Team to redraft"
              className="join-item select select-accent"
              value={redraftTeamId}
              onChange={(e) => setRedraftTeamId(e.target.value)}
            >
              {inactiveTeams.map(({ id, name, rosterName }) => (
                <option key={id} value={id}>
                  {name} - {rosterName}
                </option>
              ))}
            </select>
          </redraftFetcher.Form>
        </>
      )}
    </>
  );
}

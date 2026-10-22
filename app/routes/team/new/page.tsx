import { useState } from "react";
import { coachToTeam, team } from "~/db/schema";
import { getColumns, eq, and } from "drizzle-orm";
import { db } from "~/app/utils/drizzle";
import RosterSelector from "./roster-selector";
import { Route } from "./+types/page";
import { authContext } from "~/app/primary-layout";
import { Form, Link } from "react-router";

export async function loader({ context }: Route.LoaderArgs) {
  const { user } = context.get(authContext)!;

  const teams = await db
    .select(getColumns(team))
    .from(team)
    .leftJoin(coachToTeam, eq(team.id, coachToTeam.teamId))
    .where(and(eq(coachToTeam.coachId, user.id), eq(team.state, "draft")));

  const rosters = await db.query.roster.findMany({
    columns: { name: true, tier: true },
    with: { optionalSpecialRules: true },
    orderBy: { tier: "asc", name: "asc" },
  });

  return { teams, rosters };
}

export default function Component({ loaderData }: Route.ComponentProps) {
  const { teams, rosters } = loaderData;
  const [redraftTeamId, setRedraftTeamId] = useState(teams[0]?.id ?? "");
  return (
    <>
      <p>You do not have a team yet!</p>
      <br />
      <Form method="POST" action="/team/new/create" className="join flex">
        <button
          className="btn btn-primary join-item"
          style={{ height: "auto" }}
        >
          Create a new team
        </button>
        <div className="join join-item join-vertical">
          <input
            className="input join-item"
            placeholder="Team Name"
            name="name"
          />
          <RosterSelector rosters={rosters} />
        </div>
      </Form>
      {teams.length > 0 && (
        <>
          <div className="divider">OR</div>
          <span className="join">
            <Link className="btn join-item" to={`/team/${redraftTeamId}/edit`}>
              Redraft an existing team
            </Link>
            <select
              className="join-item select select-accent"
              value={redraftTeamId}
              onChange={(e) => setRedraftTeamId(e.target.value)}
            >
              {teams.map(({ id, name, rosterName }) => (
                <option key={id} value={id}>
                  {name} - {rosterName}
                </option>
              ))}
            </select>
          </span>
        </>
      )}
    </>
  );
}

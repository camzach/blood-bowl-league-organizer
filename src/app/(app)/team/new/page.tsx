import { coachToTeam, roster, team } from "db/schema";
import { getTableColumns, eq, isNull, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "utils/drizzle";
import RosterSelector from "./roster-selector";
import { auth } from "auth";
import { headers } from "next/headers";
import { createNewTeamAction, redraftTeam } from "./actions";

export default async function NewTeam() {
  const apiSession = await auth.api.getSession({ headers: await headers() });
  if (!apiSession) return redirect("/login");

  const { user } = apiSession;

  const teams = await db
    .select(getTableColumns(team))
    .from(team)
    .leftJoin(coachToTeam, eq(team.id, coachToTeam.teamId))
    .where(and(isNull(coachToTeam.coachId), eq(team.state, "draft")));

  const rosters = await db.query.roster.findMany({
    columns: { name: true, tier: true },
    with: { optionalSpecialRules: true },
    orderBy: [roster.tier, roster.name],
  });

  return (
    <>
      <p>You do not have a team yet!</p>
      <br />
      <form
        className="join flex"
        action={async (data) => {
          "use server";
          createNewTeamAction(data);
        }}
      >
        <input hidden readOnly value={user.id} name="userId" />
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
      </form>
      {teams.length > 0 && (
        <>
          <div className="divider">OR</div>
          <form
            action={async (data) => {
              "use server";
              redraftTeam(data);
            }}
          >
            <input hidden readOnly value={user.id} name="userId" />
            <span className="join">
              <button className="btn join-item">Redraft an exiting team</button>
              <select className="join-item select select-accent" name="teamId">
                {teams.map(({ id, name, rosterName }) => (
                  <option key={name} value={id}>
                    {name} - {rosterName}
                  </option>
                ))}
              </select>
            </span>
          </form>
        </>
      )}
    </>
  );
}

import {
  coachToTeam,
  optionalSpecialRuleToRoster,
  roster,
  team,
} from "db/schema";
import { getTableColumns, eq, isNull, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "utils/drizzle";
import RosterSelector from "./roster-selector";
import { nanoid } from "nanoid";
import { auth } from "auth";
import { headers } from "next/headers";

export default async function NewTeam() {
  const apiSession = await auth.api.getSession({ headers: await headers() });
  if (!apiSession) return redirect("/login");

  const { user, session } = apiSession;

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
        action={async (data: FormData) => {
          "use server";
          const apiSession = await auth.api.getSession({
            headers: await headers(),
          });
          if (!apiSession) return redirect("/login");
          const { session } = apiSession;

          const name = data.get("name")?.toString();
          const roster = data.get("roster")?.toString();
          const coachId = data.get("userId")?.toString();
          const optionalRule = data.get("optionalRule")?.toString();

          if (!name || !roster || !coachId || !session.activeOrganizationId)
            return;
          const ruleOptions =
            await db.query.optionalSpecialRuleToRoster.findMany({
              where: eq(optionalSpecialRuleToRoster.rosterName, roster),
            });
          const option = ruleOptions.find(
            (opt) => opt.specialRuleName === optionalRule,
          );
          if (ruleOptions.length > 0 && !option) return;

          const activeLeague = session.activeOrganizationId;
          const teamId = nanoid();
          await db.transaction(async (tx) => {
            await tx.insert(team).values({
              name,
              id: teamId,
              rosterName: roster,
              chosenSpecialRuleName: option?.specialRuleName,
              leagueId: activeLeague,
            });
            await tx.insert(coachToTeam).values({
              coachId,
              teamId,
            });
          });

          revalidatePath("/");
          return redirect(`/team/${teamId}/edit`);
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
            action={async (input: FormData) => {
              "use server";
              const teamId = input.get("teamId")?.toString();
              const coachId = input.get("userId")?.toString();

              if (!teamId || !coachId) return;

              await db.insert(coachToTeam).values({
                coachId,
                teamId,
              });
              revalidatePath("/");
              return redirect(`/team/${teamId}/edit`);
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

import { auth } from "@clerk/nextjs";
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

export default async function NewTeam() {
  const { userId } = auth();
  if (!userId) return redirect("/");

  const teams = await db
    .select(getTableColumns(team))
    .from(team)
    .leftJoin(coachToTeam, eq(team.name, coachToTeam.teamName))
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
          const name = data.get("name")?.toString();
          const roster = data.get("roster")?.toString();
          const coachId = data.get("userId")?.toString();
          const optionalRule = data.get("optionalRule")?.toString();

          if (!name || !roster || !coachId) return null;
          const ruleOptions =
            await db.query.optionalSpecialRuleToRoster.findMany({
              where: eq(optionalSpecialRuleToRoster.rosterName, roster),
            });
          const option = ruleOptions.find(
            (opt) => opt.specialRuleName === optionalRule,
          );
          if (ruleOptions.length > 0 && !option) return null;

          await db.transaction(async (tx) => {
            await tx.insert(team).values({
              name,
              rosterName: roster,
              chosenSpecialRuleName: option?.specialRuleName,
            });
            await tx.insert(coachToTeam).values({
              coachId,
              teamName: name,
            });
          });

          revalidatePath("/");
          return redirect(`/team/${name}/edit`);
        }}
      >
        <input hidden readOnly value={userId} name="userId" />
        <button
          className="btn btn-primary join-item"
          style={{ height: "auto" }}
        >
          Create a new team
        </button>
        <div className="join join-item join-vertical">
          <input
            className="input join-item input-bordered"
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
              const teamName = input.get("teamname")?.toString();
              const coachId = input.get("userId")?.toString();

              if (!teamName || !coachId) return null;

              await db.insert(coachToTeam).values({
                coachId,
                teamName,
              });
              revalidatePath("/");
              return redirect(`/team/${teamName}/edit`);
            }}
          >
            <input hidden readOnly value={userId} name="userId" />
            <span className="join">
              <button className="btn join-item">Redraft an exiting team</button>
              <select
                className="join-item select select-accent"
                name="teamname"
              >
                {teams.map(({ name, rosterName }) => (
                  <option key={name} value={name}>
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

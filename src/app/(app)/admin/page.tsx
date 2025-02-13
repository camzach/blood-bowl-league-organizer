import { clearAction, scheduleAction, seedBracket } from "./actions";
import { db } from "utils/drizzle";
import { league as dbLeague, member } from "db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import DiscordGuildLinker from "./discord-guild-linker";
import ScheduleManager from "./schedule-manager";
import { auth } from "auth";
import { headers } from "next/headers";
import Impersonate from "./impersonate";

export default async function AdminPage() {
  const apiSession = await auth.api.getSession({ headers: headers() });
  if (!apiSession) return redirect("/login");

  const { user, session } = apiSession;
  if (user.role !== "admin") {
    return notFound();
  }

  const league = await db.query.league.findFirst({
    where: eq(dbLeague.id, session.activeOrganizationId ?? ""),
  });

  if (!league) return notFound();

  const members = await db.query.member.findMany({
    where: eq(member.leagueId, league.id),
    with: {
      user: true,
    },
  });

  return (
    <div role="tablist" className="tabs tabs-bordered">
      <input
        type="radio"
        name="my_tabs_1"
        role="tab"
        className="tab"
        aria-label="Season Management"
        defaultChecked
      />
      <div role="tabpanel" className="tab-content p-10">
        <div className="flex flex-col">
          <form className="join mb-5">
            <button
              className="btn btn-primary join-item"
              formAction={scheduleAction}
            >
              Begin Season
            </button>
            <button
              className="btn btn-warning join-item"
              formAction={clearAction}
            >
              Clear Season
            </button>
            <button
              className="btn btn-secondary join-item"
              formAction={seedBracket}
            >
              Seed Bracket
            </button>
          </form>
          <ScheduleManager leagueId={league.id} />
        </div>
      </div>

      <input
        type="radio"
        name="my_tabs_1"
        role="tab"
        className="tab"
        aria-label="Discord Integration"
      />
      <div role="tabpanel" className="tab-content p-10">
        <DiscordGuildLinker />
      </div>

      <input
        type="radio"
        name="my_tabs_1"
        role="tab"
        className="tab"
        aria-label="User Impersonation"
      />
      <div role="tabpanel" className="tab-content p-10">
        <Impersonate
          users={members.reduce(
            (acc, member) => {
              acc[member.user.id] = member.user.name;
              return acc;
            },
            {} as Record<string, string>,
          )}
        />
      </div>
    </div>
  );
}

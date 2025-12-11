import { clearAction, scheduleAction, seedBracket, endSeason } from "./actions";
import { db } from "~/utils/drizzle";
import { league as dbLeague, team } from "~/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import DiscordGuildLinker from "./discord-guild-linker";
import InviteManager from "./invite-manager";
import ScheduleManager from "./schedule-manager";
import { auth } from "~/auth";
import { headers } from "next/headers";
import { isLeagueAdmin } from "~/utils/is-league-admin";

export default async function AdminPage() {
  const apiSession = await auth.api.getSession({ headers: await headers() });
  if (!apiSession) return redirect("/login");

  const { user, session } = apiSession;
  if (
    !session.activeOrganizationId ||
    !(await isLeagueAdmin(user.id, session.activeOrganizationId))
  ) {
    return notFound();
  }

  const league = await db.query.league.findFirst({
    where: eq(dbLeague.id, session.activeOrganizationId ?? ""),
  });

  if (!league) return notFound();

  const draftTeams = await db.query.team.findMany({
    where: and(eq(team.leagueId, league.id), eq(team.state, "draft")),
    columns: {
      name: true,
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
          {draftTeams.length > 0 && (
            <div className="alert alert-warning mb-5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 shrink-0 stroke-current"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>
                The following teams are still in draft mode:{" "}
                {draftTeams.map((t) => t.name).join(", ")}
              </span>
            </div>
          )}
          <div className="join mb-5">
            <button
              className="btn btn-primary join-item"
              onClick={scheduleAction}
            >
              Begin Season
            </button>
            <button className="btn btn-warning join-item" onClick={clearAction}>
              Clear Season
            </button>
            <button
              className="btn btn-secondary join-item"
              onClick={seedBracket}
            >
              Seed Bracket
            </button>
            <button className="btn btn-accent join-item" onClick={endSeason}>
              End Season
            </button>
          </div>
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
        aria-label="Invites"
      />
      <div role="tabpanel" className="tab-content p-10">
        <InviteManager />
      </div>
    </div>
  );
}

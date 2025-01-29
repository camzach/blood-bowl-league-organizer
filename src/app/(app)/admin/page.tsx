import { clearAction, scheduleAction, seedBracket } from "./actions";
import { db } from "utils/drizzle";
import { league as dbLeague } from "db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import DiscordGuildLinker from "./discord-guild-linker";
import ScheduleManager from "./schedule-manager";
import { auth } from "auth";
import { headers } from "next/headers";

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
  console.log(league);
  if (!league) return notFound();

  return (
    <div className="flex flex-col">
      <form className="join mb-5">
        <button
          className="btn btn-primary join-item"
          formAction={scheduleAction}
        >
          Begin Season
        </button>
        <button className="btn btn-warning join-item" formAction={clearAction}>
          Clear Season
        </button>
        <button
          className="btn btn-secondary join-item"
          formAction={seedBracket}
        >
          Seed Bracket
        </button>
        <DiscordGuildLinker />
      </form>
      <ScheduleManager leagueId={league.id} />
    </div>
  );
}

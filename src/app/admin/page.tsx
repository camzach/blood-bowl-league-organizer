import { currentUser } from "@clerk/nextjs/server";
import { clearAction, scheduleAction, seedBracket } from "./actions";
import { db } from "utils/drizzle";
import { league as dbLeague } from "db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import DiscordGuildLinker from "./discord-guild-linker";
import ScheduleManager from "./schedule-manager";

export default async function AdminPage() {
  const user = await currentUser();
  if (!user?.publicMetadata.isAdmin || !user?.publicMetadata.league)
    return notFound();

  const league = await db.query.league.findFirst({
    where: eq(dbLeague.name, user.publicMetadata.league as string),
  });
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
      <ScheduleManager leagueName={league.name} />
    </div>
  );
}

import { currentUser } from "@clerk/nextjs";
import { clearAction, scheduleAction } from "./actions";
import { db } from "utils/drizzle";
import { league as dbLeague } from "db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import DiscordGuildLinker from "./discord-guild-linker";

export default async function AdminPage() {
  const user = await currentUser();
  if (!user?.publicMetadata.isAdmin || !user?.publicMetadata.league)
    return notFound();

  const league = await db.query.league.findFirst({
    where: eq(dbLeague.name, user.publicMetadata.league as string),
  });
  if (!league) return notFound();

  return (
    <>
      <form className="join">
        <button
          className="btn btn-primary join-item"
          formAction={scheduleAction}
        >
          Begin Season
        </button>
        <button className="btn btn-warning join-item" formAction={clearAction}>
          Clear Season
        </button>
        <DiscordGuildLinker />
      </form>
    </>
  );
}

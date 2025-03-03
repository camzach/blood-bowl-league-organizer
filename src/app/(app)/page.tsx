import { auth } from "auth";
import { coachToTeam } from "db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "utils/drizzle";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) return redirect("/login");

  const myTeam = await db.query.coachToTeam.findFirst({
    where: eq(coachToTeam.coachId, session.user.id),
    with: { team: { columns: { id: true } } },
  });

  return (
    <>
      <ul>
        <li>
          <Link className="link" href="/schedule">
            View schedule
          </Link>
        </li>
        <li>
          <Link className="link" href={`/team/${myTeam?.team.id ?? "new"}`}>
            View your team
          </Link>
        </li>
        <li>
          <Link className="link" href="/league-table">
            View league table
          </Link>
        </li>
      </ul>
    </>
  );
}

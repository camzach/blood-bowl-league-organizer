import { RedirectToSignIn, auth } from "@clerk/nextjs";
import { coachToTeam } from "db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "utils/drizzle";

export default async function Home() {
  const { userId } = auth();
  if (!userId) return <RedirectToSignIn />;

  const myTeam = await db.query.coachToTeam.findFirst({
    where: eq(coachToTeam.coachId, userId),
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
          <Link className="link" href={`/team/${myTeam?.teamName}`}>
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

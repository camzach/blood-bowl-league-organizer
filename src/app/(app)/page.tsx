import { coachToTeam } from "db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "utils/drizzle";

export default async function Home() {
  // const { userId, redirectToSignIn } = auth();
  // if (!userId) return redirectToSignIn();

  // const myTeam = await db.query.coachToTeam.findFirst({
  //   where: eq(coachToTeam.coachId, userId),
  //   with: { team: { columns: { id: true } } },
  // });

  return (
    <>
      <ul>
        <li>
          <Link className="link" href="/schedule">
            View schedule
          </Link>
        </li>
        {/*
          <li>
            <Link className="link" href={`/team/${myTeam?.team.id ?? "new"}`}>
              View your team
            </Link>
          </li>
        */}
        <li>
          <Link className="link" href="/league-table">
            View league table
          </Link>
        </li>
      </ul>
    </>
  );
}

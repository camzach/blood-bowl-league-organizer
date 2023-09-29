import { auth } from "@clerk/nextjs";
import { coachToTeam } from "db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import drizzle from "utils/drizzle";

export default async function Home() {
  const { userId } = auth();
  // const myTeam = await drizzle.query.coachToTeam.findFirst({
  //   where: eq(coachToTeam.coachName, userId),
  // });
  console.log(userId);
  return (
    <>
      <ul>
        <li>
          <Link className="link" href="/schedule">
            View schedule
          </Link>
        </li>
        <li>
          <Link className="link" href={`/team/`}>
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

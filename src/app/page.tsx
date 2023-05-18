import { getServerSession } from "next-auth/next";
import { authOptions } from "pages/api/auth/[...nextauth]";
import Link from "next/link";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <>
      <ul>
        <li>
          <Link className="link" href="/schedule">
            View schedule
          </Link>
        </li>
        <li>
          <Link className="link" href={`/team/${session?.user.teams[0]}`}>
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

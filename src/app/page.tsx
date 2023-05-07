import type { ReactNode } from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "pages/api/auth/[...nextauth]";
import Link from "components/link";

export default async function Home(): Promise<ReactNode> {
  const session = await getServerSession(authOptions);

  return (
    <>
      <ul>
        <li>
          <Link href="/schedule">View schedule</Link>
        </li>
        <li>
          <Link href={`/team/${session?.user.teams[0]}`}>View your team</Link>
        </li>
        <li>
          <Link href="/league-table">View league table</Link>
        </li>
      </ul>
    </>
  );
}

import Link from "next/link";
import type { PropsWithChildren } from "react";
// import PasswordChangeNotif from "./password-changer";
import "./global.css";
import type { Metadata } from "next";
import Tooltip from "components/tooltip";
import { db } from "utils/drizzle";
import { coachToTeam } from "db/schema";
import { eq } from "drizzle-orm";
import {
  ClerkProvider,
  RedirectToSignIn,
  UserButton,
  auth,
} from "@clerk/nextjs";

export const metadata: Metadata = {
  title: { template: "%s | BBLO", absolute: "BBLO" },
  description: "Blood Bowl League Organizer",
};

export default async function RootLayout({ children }: PropsWithChildren) {
  const { userId } = auth();
  if (!userId) return <RedirectToSignIn />;

  const myTeam = await db.query.coachToTeam.findFirst({
    where: eq(coachToTeam.coachId, userId),
  });

  return (
    <ClerkProvider>
      <html data-theme="dark">
        <body>
          <header className="navbar bg-primary text-primary-content">
            <h1 className="m-0 inline-block w-min text-4xl">BBLO</h1>
            <nav className="ml-8 flex gap-8">
              <Link className="text-2xl" href={`/team/${myTeam?.teamName}`}>
                Teams
              </Link>
              <Link className="text-2xl" href={`/schedule`}>
                Schedule
              </Link>
              <Link className="text-2xl" href={`/league-table`}>
                League Table
              </Link>
              <Link className="text-2xl" href={`/playoffs`}>
                Playoffs
              </Link>
            </nav>
            <span className="ml-auto">
              <UserButton />
            </span>
          </header>
          <main className="p-4">{children}</main>
          <Tooltip />
        </body>
      </html>
    </ClerkProvider>
  );
}

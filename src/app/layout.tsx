import Link from "next/link";
import type { PropsWithChildren } from "react";
import "./global.css";
import type { Metadata } from "next";
import { db } from "utils/drizzle";
import { coachToTeam } from "db/schema";
import { eq } from "drizzle-orm";
import {
  ClerkProvider,
  RedirectToSignIn,
  UserButton,
  auth,
  currentUser,
} from "@clerk/nextjs";

export const metadata: Metadata = {
  title: { template: "%s | BBLO", absolute: "BBLO" },
  description: "Blood Bowl League Organizer",
};

export default async function RootLayout({ children }: PropsWithChildren) {
  const { userId } = auth();
  const user: { publicMetadata: { isAdmin?: boolean } } | null =
    await currentUser();

  // TODO: investigate useId issue
  const drawerId = "_drawer_";

  if (!userId) return <RedirectToSignIn />;

  const myTeam = await db.query.coachToTeam.findFirst({
    where: eq(coachToTeam.coachId, userId),
  });

  return (
    <ClerkProvider>
      <html data-theme="dark">
        <body>
          <div className="drawer">
            <input id={drawerId} type="checkbox" className="drawer-toggle" />
            <div className="drawer-content">
              <header className="navbar">
                <div className="navbar-start md:hidden">
                  <label htmlFor={drawerId} className="text-5xl">
                    ≡
                  </label>
                </div>
                <span className="text-3xl max-sm:navbar-center md:navbar-start">
                  BBLO
                </span>
                <nav className="navbar-center hidden gap-3 md:flex">
                  <NavLinks
                    team={myTeam?.teamName ?? "new"}
                    isAdmin={!!user?.publicMetadata.isAdmin}
                  />
                </nav>
                <span className="navbar-end">
                  <UserButton />
                </span>
              </header>
              <main className="p-4">{children}</main>
            </div>
            <div className="drawer-side">
              <label
                htmlFor={drawerId}
                aria-label="close sidebar"
                className="drawer-overlay"
              ></label>
              <nav className="menu min-h-full w-fit bg-base-200 p-4 pr-16 text-base-content">
                <NavLinks
                  team={myTeam?.teamName ?? "new"}
                  isAdmin={!!user?.publicMetadata.isAdmin}
                />
              </nav>
            </div>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}

function NavLinks(props: { team: string; isAdmin: boolean }) {
  const result = [
    <Link key="team" className="text-xl" href={`/team/${props.team}`}>
      Team
    </Link>,
    <Link key="schedule" className="text-xl" href="/schedule">
      Schedule
    </Link>,
    <Link key="table" className="text-xl" href="/league-table">
      League Table
    </Link>,
    <Link key="playoffs" className="text-xl" href="/playoffs">
      Playoffs
    </Link>,
  ];
  if (props.isAdmin) {
    result.push(
      <Link key="admin" className="text-xl" href="/admin">
        Admin
      </Link>,
    );
  }
  return result;
}

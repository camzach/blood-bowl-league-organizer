import Link from "next/link";
import type { PropsWithChildren } from "react";
import "./global.css";
import type { Metadata } from "next";
import { db } from "utils/drizzle";
import { team as dbTeam, season } from "db/schema";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ClerkProvider, UserButton } from "@clerk/nextjs";
import { and, eq, sql } from "drizzle-orm";
import TeamsList from "./teams-list";

export const metadata: Metadata = {
  title: { template: "%s | BBLO", absolute: "BBLO" },
  description: "Blood Bowl League Organizer",
};

export default async function RootLayout({ children }: PropsWithChildren) {
  const user = await currentUser();

  // TODO: investigate useId issue
  const drawerId = "_drawer_";

  if (!user) return auth().redirectToSignIn();

  const teams = await db.query.team.findMany({
    where: eq(dbTeam.leagueName, user.publicMetadata.league as string),
  });

  const activeSeason = await db.query.season.findFirst({
    where: and(
      eq(season.leagueName, user.publicMetadata.league as string),
      eq(season.isActive, true),
    ),
    with: {
      bracketGames: {
        extras: { _: sql<never>`'_'`.as("_") },
      },
    },
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
                    teams={teams}
                    showPlayoffsLink={
                      (activeSeason?.bracketGames?.length ?? 0) > 0
                    }
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
              <nav className="menu min-h-full w-fit bg-base-200 p-4 text-base-content">
                <NavLinks
                  teams={teams}
                  showPlayoffsLink={
                    (activeSeason?.bracketGames?.length ?? 0) > 0
                  }
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

function NavLinks(props: {
  teams: Array<{ name: string; id: string }>;
  showPlayoffsLink: boolean;
  isAdmin: boolean;
}) {
  return (
    <ul className="menu text-xl md:menu-horizontal">
      <li>
        <TeamsList teams={props.teams} />
      </li>
      <li>
        <Link href="/schedule">Schedule</Link>
      </li>
      <li>
        <Link href="/league-table">League Table</Link>
      </li>
      {props.showPlayoffsLink && (
        <li>
          <Link href="/playoffs">Playoffs</Link>
        </li>
      )}
      {props.isAdmin && (
        <li>
          <Link href="/admin">Admin</Link>
        </li>
      )}
    </ul>
  );
}

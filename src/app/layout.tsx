import Link from "next/link";
import type { PropsWithChildren } from "react";
import "./global.css";
import type { Metadata } from "next";
import { db } from "utils/drizzle";
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

  const teams = await db.query.team.findMany();

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
                    teams={teams.map((t) => t.name)}
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
                  teams={teams.map((t) => t.name)}
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

function NavLinks(props: { teams: string[]; isAdmin: boolean }) {
  return (
    <ul className="menu text-xl md:menu-horizontal">
      <li>
        <details>
          <summary>Teams</summary>
          <ul className="z-10">
            {props.teams.map((team) => (
              <li key={team}>
                <Link href={`/team/${team}`}>{team}</Link>
              </li>
            ))}
          </ul>
        </details>
      </li>
      <li>
        <Link href="/schedule">Schedule</Link>
      </li>
      <li>
        <Link href="/league-table">League Table</Link>
      </li>
      <li>
        <Link href="/playoffs">Playoffs</Link>
      </li>
      {props.isAdmin && (
        <li>
          <Link href="/admin">Admin</Link>
        </li>
      )}
    </ul>
  );
}

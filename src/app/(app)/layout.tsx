import Link from "next/link";
import type { PropsWithChildren } from "react";
import type { Metadata } from "next";
import { db } from "utils/drizzle";
import { team as dbTeam, season } from "db/schema";
import TeamsList from "./teams-list";
import { auth } from "auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import SignoutButton from "components/signout-button";
import { isLeagueAdmin } from "utils/is-league-admin";

export const metadata: Metadata = {
  title: { template: "%s | BBLO", absolute: "BBLO" },
  description: "Blood Bowl League Organizer",
};

export default async function RootLayout({ children }: PropsWithChildren) {
  const apiSession = await auth.api.getSession({
    headers: await headers(),
  });
  if (!apiSession) return redirect("/login");
  const { user, session } = apiSession;

  // TODO: investigate useId issue
  const drawerId = "_drawer_";

  const teams = await db.query.team.findMany({
    where: eq(dbTeam.leagueId, session.activeOrganizationId ?? ""),
  });

  const activeSeason = await db.query.season.findFirst({
    where: and(
      eq(season.leagueId, session.activeOrganizationId ?? ""),
      eq(season.isActive, true),
    ),
    with: {
      bracketGames: {
        extras: { _: sql<never>`'_'`.as("_") },
      },
    },
  });

  return (
    <div className="drawer">
      <input id={drawerId} type="checkbox" className="drawer-toggle" />
      <div className="drawer-content">
        <header className="navbar px-4">
          <div className="navbar-start md:hidden">
            <label htmlFor={drawerId} className="text-5xl">
              ≡
            </label>
          </div>
          <span className="max-sm:navbar-center md:navbar-start text-3xl">
            <Link href={"/"}>BBLO</Link>
          </span>
          <nav className="navbar-center hidden gap-3 md:flex">
            <NavLinks
              teams={teams}
              showPlayoffsLink={(activeSeason?.bracketGames?.length ?? 0) > 0}
              isAdmin={await isLeagueAdmin(
                user.id,
                session.activeOrganizationId ?? "",
              )}
            />
          </nav>
          <span className="navbar-end">
            <div className="dropdown dropdown-end dropdown-hover">
              <div
                tabIndex={0}
                role="button"
                className="btn btn-circle m-1 text-xl font-bold"
              >
                {user.name.slice(0, 1).toLocaleUpperCase()}
              </div>
              <ul
                tabIndex={0}
                className="menu dropdown-content rounded-box bg-base-100 z-1 w-52 p-2 shadow-sm"
              >
                <li>
                  <SignoutButton />
                </li>
              </ul>
            </div>
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
        <nav className="menu bg-base-200 text-base-content min-h-full w-fit p-4">
          <NavLinks
            teams={teams}
            showPlayoffsLink={(activeSeason?.bracketGames?.length ?? 0) > 0}
            isAdmin={await isLeagueAdmin(
              user.id,
              session.activeOrganizationId ?? "",
            )}
          />
        </nav>
      </div>
    </div>
  );
}

function NavLinks(props: {
  teams: Array<{ name: string; id: string }>;
  showPlayoffsLink: boolean;
  isAdmin: boolean;
}) {
  return (
    <ul className="menu md:menu-horizontal text-xl">
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

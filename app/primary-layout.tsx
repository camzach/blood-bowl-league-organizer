import { db } from "~/app/utils/drizzle";
import NavLinks from "./components/nav-links";
import { Link, redirect } from "react-router";
import type { Route } from "./+types/primary-layout";

import { Outlet, createContext } from "react-router";
import "@react-router/node";
import { auth } from "~/app/utils/auth.server";
import LeagueSelector from "./components/league-selector";
import SignoutButton from "./components/signout-button";
import { eq } from "drizzle-orm";
import { bracketGame } from "~/db/schema";

type BetterAuthSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

// This is typed as non-null, but we're putting null here at startup.
// It will be replaced with a non-null value in the middleware.
// Accessing this context outside of an authenticated route will notresult
// result in type errors, but will result in runtime errors.
export const authContext = createContext<BetterAuthSession>(null!);

export const middleware: Route.MiddlewareFunction[] = [
  async ({ request, context }) => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      throw redirect("/login");
    }

    context.set(authContext, session);
  },
];

export async function loader({ context, request }: Route.LoaderArgs) {
  const { user, session } = context.get(authContext);

  const userLeagues = await auth.api.listOrganizations({
    headers: request.headers,
  });

  const teams = await db.query.team.findMany({
    where: {
      NOT: { state: "draft" },
      leagueId: session.activeOrganizationId ?? "",
    },
    orderBy: { name: "asc" },
  });

  const activeSeason = await db.query.season.findFirst({
    where: {
      leagueId: session.activeOrganizationId ?? "",
      isActive: true,
    },
    extras: {
      totalBracketGames: (table) =>
        db.$count(bracketGame, eq(bracketGame.seasonId, table.id)),
    },
  });

  const activeLeague = await db.query.league.findFirst({
    where: { id: session.activeOrganizationId ?? "" },
  });

  return { user, activeLeague, userLeagues, teams, activeSeason };
}

export default function RootLayout({ loaderData }: Route.ComponentProps) {
  // TODO: investigate useId issue
  const drawerId = "_drawer_";

  const { user, teams, activeLeague, userLeagues, activeSeason } = loaderData;

  return (
    <>
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
              <Link to={"/"}>BBLO</Link>
            </span>
            <nav className="navbar-center hidden gap-3 md:flex">
              <NavLinks
                teams={teams}
                showPlayoffsLink={(activeSeason?.totalBracketGames ?? 0) > 0}
                isAdmin={user.role === "admin"}
              />
            </nav>
            <span className="navbar-end">
              <div className="dropdown dropdown-end dropdown-hover">
                <div
                  tabIndex={0}
                  role="button"
                  className="btn btn-circle m-1 text-xl font-bold"
                >
                  {"C"}
                </div>
                <ul
                  tabIndex={0}
                  className="menu dropdown-content rounded-box bg-base-100 z-1 w-52 p-2 shadow-sm"
                >
                  <li>
                    <LeagueSelector
                      leagues={userLeagues}
                      activeLeagueName={
                        activeLeague?.name ?? "No active league"
                      }
                      activeLeagueId={activeLeague?.id ?? ""}
                    />
                  </li>
                  <li>
                    <SignoutButton />
                  </li>
                </ul>
              </div>
            </span>
          </header>
          <main className="p-4">
            <Outlet />
          </main>
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
              showPlayoffsLink={(activeSeason?.totalBracketGames ?? 0) > 0}
              isAdmin={user.role === "admin"}
            />
          </nav>
        </div>
      </div>
    </>
  );
}

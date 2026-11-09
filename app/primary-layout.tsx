import { db } from "~/app/utils/drizzle";
import NavLinks from "./components/nav-links";
import { Link, redirect, Outlet, createContext } from "react-router";
import type { Route } from "./+types/primary-layout";
import "@react-router/node";
import { auth } from "~/app/utils/auth.server";
import { isAPIError } from "better-auth/api";
import LeagueSelector from "./components/league-selector";
import SignoutButton from "./components/signout-button";
import { eq } from "drizzle-orm";
import { bracketGame } from "~/db/schema";
import { useId } from "react";
import { isLeagueAdmin, type ActiveLeague } from "./utils/permissions";

type BetterAuthSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

// This is typed as non-null, but we're putting null here at startup.
// It will be replaced with a non-null value in the middleware.
// Accessing this context outside of an authenticated route will notresult
// result in type errors, but will result in runtime errors.
export const authContext = createContext<BetterAuthSession>(null!);

// The league the user currently has selected, along with their role in it.
// null if no league is selected, or the user is no longer a member of it.
export const activeLeagueContext = createContext<ActiveLeague | null>(null);

export const middleware: Route.MiddlewareFunction[] = [
  async ({ request, context }) => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      throw redirect("/login");
    }

    context.set(authContext, session);
    context.set(activeLeagueContext, await getActiveLeague(request, session));
  },
];

// getActiveMember throws a BAD_REQUEST when the user has no active league or
// is no longer a member of it. Both are normal states here, so map them to null.
async function getActiveLeague(
  request: Request,
  session: BetterAuthSession,
): Promise<ActiveLeague | null> {
  if (!session.session.activeOrganizationId) return null;
  try {
    const { organizationId, role } = await auth.api.getActiveMember({
      headers: request.headers,
    });
    return { id: organizationId, role };
  } catch (error) {
    if (isAPIError(error) && error.status === "BAD_REQUEST") return null;
    throw error;
  }
}

export async function loader({ context, request }: Route.LoaderArgs) {
  const { user } = context.get(authContext);
  const activeLeagueMembership = context.get(activeLeagueContext);

  const userLeagues = await auth.api.listOrganizations({
    headers: request.headers,
  });

  const teams = activeLeagueMembership
    ? await db.query.team.findMany({
        where: {
          NOT: { state: "inactive" },
          leagueId: activeLeagueMembership.id,
        },
        orderBy: { name: "asc" },
      })
    : [];

  const activeSeason = activeLeagueMembership
    ? await db.query.season.findFirst({
        where: {
          leagueId: activeLeagueMembership.id,
          isActive: true,
        },
        extras: {
          totalBracketGames: (table) =>
            db.$count(bracketGame, eq(bracketGame.seasonId, table.id)),
        },
      })
    : null;

  const activeLeague = userLeagues.find(
    (league) => league.id === activeLeagueMembership?.id,
  );

  return {
    activeLeague,
    isLeagueAdmin: isLeagueAdmin(activeLeagueMembership),
    userLeagues,
    teams,
    activeSeason,
    user,
  };
}

export default function RootLayout({ loaderData }: Route.ComponentProps) {
  const drawerId = useId();

  const { user, teams, activeLeague, userLeagues, activeSeason } = loaderData;

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
            <Link to={"/"}>BBLO</Link>
          </span>
          <nav className="navbar-center hidden gap-3 md:flex">
            <NavLinks
              teams={teams}
              showPlayoffsLink={(activeSeason?.totalBracketGames ?? 0) > 0}
              isAdmin={loaderData.isLeagueAdmin}
            />
          </nav>
          <span className="navbar-end">
            <div className="dropdown dropdown-end dropdown-hover">
              <div
                tabIndex={0}
                role="button"
                aria-label="User menu"
                className="btn btn-circle m-1 text-xl font-bold"
              >
                {user.name[0].toUpperCase()}
              </div>
              <ul
                tabIndex={0}
                className="menu dropdown-content rounded-box bg-base-100 z-1 w-52 p-2 shadow-sm"
              >
                <li>
                  <LeagueSelector
                    leagues={userLeagues}
                    activeLeagueName={activeLeague?.name ?? "No active league"}
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
            isAdmin={loaderData.isLeagueAdmin}
          />
        </nav>
      </div>
    </div>
  );
}

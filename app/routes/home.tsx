import { Link, useRevalidator } from "react-router";
import type { Route } from "./+types/home";
import { authContext } from "../primary-layout";
import { db } from "~/app/utils/drizzle";
import { auth } from "~/app/utils/auth.server";
import { authClient } from "~/app/utils/auth.client";

export async function loader({ context, request }: Route.LoaderArgs) {
  const { user, session } = context.get(authContext);

  const myLeagues = await auth.api.listOrganizations({
    headers: request.headers,
  });
  const activeLeague = session.activeOrganizationId ?? "";

  const myTeams = await db.query.team.findMany({
    where: { coaches: { id: user.id }, leagueId: activeLeague },
  });

  const teamIds = myTeams.map((mt) => mt.id);

  const upcomingGames = await db.query.roundRobinGame.findMany({
    where: {
      season: { leagueId: activeLeague, isActive: true },
      game: {
        OR: [
          { homeDetails: { teamId: { in: teamIds } } },
          { awayDetails: { teamId: { in: teamIds } } },
        ],
      },
    },
    with: {
      game: {
        with: {
          homeDetails: { with: { team: true } },
          awayDetails: { with: { team: true } },
        },
      },
    },
  });

  return { activeLeague, myTeams, myLeagues, upcomingGames };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const revalidator = useRevalidator();
  const { activeLeague, myTeams, myLeagues, upcomingGames } = loaderData;
  if (!activeLeague && myLeagues.length === 0) {
    return (
      <div
        className="mb-4 border-yellow-500 bg-yellow-100 p-4 text-yellow-700"
        role="alert"
      >
        <strong className="font-bold">Warning!</strong>
        <span className="block sm:inline">
          You are not currently part of any leagues. Ask an admin to be added,
          or create your own.
        </span>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const data = new FormData(e.target);
            const leagueName = data.get("leagueName")?.toString();
            if (!leagueName) {
              return;
            }
            await authClient.organization.create({
              name: leagueName,
              slug: leagueName.toLowerCase().replace(/\s/g, "-"),
            });
            await revalidator.revalidate();
          }}
        >
          <input
            type="text"
            name="leagueName"
            placeholder="League Name"
            className="input input-bordered w-full max-w-xs"
          />
          <button type="submit" className="btn btn-primary">
            Create League
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Your Teams</h1>
      {myTeams.length === 0 ? (
        <p>
          You don&apos;t have any teams yet.{" "}
          <Link className="link" to="/team/new">
            Create one!
          </Link>
        </p>
      ) : (
        <ul className="mb-8 list-inside list-disc">
          {myTeams.map((t) => (
            <li key={t.id}>
              <Link className="link" to={`/team/${t.id}`}>
                {t.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h1 className="mb-4 text-2xl font-bold">Upcoming Games</h1>
      {upcomingGames.length === 0 ? (
        <p>No upcoming games.</p>
      ) : (
        <ul className="list-inside list-disc">
          {upcomingGames.map((game) => (
            <li key={game.gameId}>
              <Link className="link" to={`/game/${game.gameId}/scheduled`}>
                {game.game.homeDetails?.team.name ?? "TBD"} vs{" "}
                {game.game.awayDetails?.team.name ?? "TBD"}
                on{" "}
                {game.game.scheduledTime
                  ? new Date(game.game.scheduledTime).toLocaleDateString()
                  : "TBD"}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h1 className="mt-8 mb-4 text-2xl font-bold">Quick Links</h1>
      <ul>
        <li>
          <Link className="link" to="/schedule">
            View full schedule
          </Link>
        </li>
        <li>
          <Link className="link" to="/league-table">
            View league table
          </Link>
        </li>
      </ul>
    </>
  );
}

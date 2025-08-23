import { auth } from "~/auth";
import { coachToTeam, team } from "~/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "~/utils/drizzle";
import fetchGames from "./schedule/fetch-games";

interface GameData {
  round: number;
  state:
    | "scheduled"
    | "journeymen"
    | "inducements"
    | "in_progress"
    | "complete";
  time: Date | null;
  homeDetails: {
    teamName: string;
    teamId: string;
    touchdowns: number;
    casualties: number;
  };
  awayDetails: {
    teamName: string;
    teamId: string;
    touchdowns: number;
    casualties: number;
  };
  id: string;
}

interface TeamData {
  name: string;
  id: string;
}

interface FetchGamesResult {
  teams: TeamData[];
  games: GameData[];
}

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) return redirect("/login");

  const myLeagues = await auth.api.listOrganizations({
    headers: await headers(),
  });
  const activeLeague = session.session.activeOrganizationId;

  const myTeams = await db
    .select()
    .from(team)
    .leftJoin(coachToTeam, eq(coachToTeam.coachId, session.user.id))
    .where(activeLeague ? eq(team.leagueId, activeLeague) : sql`1=0`);

  const leagueId = myTeams[0]?.team.leagueId;
  const teamIds = myTeams.map((mt) => mt.team.id);

  let upcomingGames: FetchGamesResult = { games: [], teams: [] };
  if (leagueId && teamIds.length > 0) {
    upcomingGames = await fetchGames({
      league: leagueId,
      teamId: teamIds,
      state: "scheduled",
    });
  }

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
          action={async (data) => {
            "use server";
            const leagueName = data.get("leagueName") as string;
            try {
              await auth.api.createOrganization({
                body: {
                  name: leagueName,
                  slug: encodeURIComponent(
                    leagueName.toLowerCase().replace(" ", "-"),
                  ),
                },
                headers: await headers(),
              });
            } catch (e) {
              console.log(e);
            }
            redirect("/");
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
          <Link className="link" href="/team/new">
            Create one!
          </Link>
        </p>
      ) : (
        <ul className="mb-8 list-inside list-disc">
          {myTeams.map((coachTeam) => (
            <li key={coachTeam.team.id}>
              <Link className="link" href={`/team/${coachTeam.team.id}`}>
                {coachTeam.team.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h1 className="mb-4 text-2xl font-bold">Upcoming Games</h1>
      {upcomingGames.games.length === 0 ? (
        <p>No upcoming games.</p>
      ) : (
        <ul className="list-inside list-disc">
          {upcomingGames.games.map((game) => (
            <li key={game.id}>
              <Link className="link" href={`/game/${game.id}/scheduled`}>
                {game.homeDetails.teamName} vs {game.awayDetails.teamName} on{" "}
                {game.time ? new Date(game.time).toLocaleDateString() : "TBD"}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h1 className="mt-8 mb-4 text-2xl font-bold">Quick Links</h1>
      <ul>
        <li>
          <Link className="link" href="/schedule">
            View full schedule
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

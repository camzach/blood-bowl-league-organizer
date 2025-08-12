import { auth } from "auth";
import { coachToTeam } from "db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "utils/drizzle";
import fetchGames from "./schedule/fetch-games";

interface GameData {
  round: number;
  state: "scheduled" | "journeymen" | "inducements" | "in_progress" | "complete";
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

  const myTeams = await db.query.coachToTeam.findMany({
    where: eq(coachToTeam.coachId, session.user.id),
    with: { team: { columns: { id: true, name: true, leagueId: true } } },
  });

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

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Your Teams</h1>
      {myTeams.length === 0 ? (
        <p>You don&apos;t have any teams yet. <Link className="link" href="/team/new">Create one!</Link></p>
      ) : (
        <ul className="list-disc list-inside mb-8">
          {myTeams.map((coachTeam) => (
            <li key={coachTeam.team.id}>
              <Link className="link" href={`/team/${coachTeam.team.id}`}>
                {coachTeam.team.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h1 className="text-2xl font-bold mb-4">Upcoming Games</h1>
      {upcomingGames.games.length === 0 ? (
        <p>No upcoming games.</p>
      ) : (
        <ul className="list-disc list-inside">
          {upcomingGames.games.map((game) => (
            <li key={game.id}>
              <Link className="link" href={`/game/${game.id}/scheduled`}>
                {game.homeDetails.teamName} vs {game.awayDetails.teamName} on {game.time ? new Date(game.time).toLocaleDateString() : 'TBD'}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h1 className="text-2xl font-bold mt-8 mb-4">Quick Links</h1>
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

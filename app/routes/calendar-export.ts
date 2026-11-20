import { data } from "react-router";
import type { Route } from "./+types/calendar-export";
import { db } from "~/app/utils/drizzle";
import { buildCalendar } from "~/app/utils/calendar";
import { findCalendarFeedLeagueId } from "~/app/utils/calendar-feed.server";

const gameWithTeams = {
  with: {
    homeDetails: { with: { team: { columns: { name: true } } } },
    awayDetails: { with: { team: { columns: { name: true } } } },
  },
} as const;

export async function loader({ params, request }: Route.LoaderArgs) {
  const leagueId = await findCalendarFeedLeagueId(params.token);
  if (!leagueId) {
    throw data("No calendar found", { status: 404 });
  }

  const season = await db.query.season.findFirst({
    where: { leagueId, isActive: true },
    with: {
      roundRobinGames: { with: { game: gameWithTeams } },
      bracketGames: { with: { game: gameWithTeams } },
    },
  });

  const games = [
    ...(season?.roundRobinGames ?? []),
    ...(season?.bracketGames ?? []),
  ].flatMap(({ game }) => (game ? [game] : []));

  const teamIds = new URL(request.url).searchParams.getAll("teamId");

  return new Response(buildCalendar(games, teamIds), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=calendar.ics",
    },
  });
}

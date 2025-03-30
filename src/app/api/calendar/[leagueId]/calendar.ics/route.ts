import { NextRequest } from "next/server";
import ical from "ical-generator";
import { db } from "utils/drizzle";
import { league as dbLeague } from "db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> },
) {
  const teamId = req.nextUrl.searchParams.getAll("teamId");

  const league = await db.query.league.findFirst({
    where: eq(dbLeague.id, (await params).leagueId),
    with: {
      seasons: {
        with: {
          roundRobinGames: {
            with: {
              game: {
                with: {
                  homeDetails: { with: { team: true } },
                  awayDetails: { with: { team: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!league) return new Response("No calendar found");

  const cal = ical({ name: "Blood Bowl" });
  league.seasons.forEach((season) =>
    season.roundRobinGames.forEach((game) => {
      if (
        teamId.length > 0 &&
        !(
          (game.game.homeDetails?.teamId &&
            teamId.includes(game.game.homeDetails.teamId)) ||
          (game.game.awayDetails?.teamId &&
            teamId.includes(game.game.awayDetails.teamId))
        )
      ) {
        return;
      }
      if (!game.game.scheduledTime) {
        return;
      }
      cal.createEvent({
        summary: `${game.game.homeDetails?.team.name ?? "TBD"} @ ${game.game.awayDetails?.team.name ?? "TBD"}`,
        start: game.game.scheduledTime,
        end: new Date(game.game.scheduledTime.valueOf() + 3 * 60 * 60 * 1000),
      });
    }),
  );

  return new Response(cal.toString(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=calendar.ics",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

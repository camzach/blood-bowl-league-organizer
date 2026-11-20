import { addHours } from "date-fns";
import ical from "ical-generator";

type CalendarTeam = { teamId: string; team: { name: string } };

export type CalendarGame = {
  id: string;
  scheduledTime: Date | null;
  homeDetails: CalendarTeam | null;
  awayDetails: CalendarTeam | null;
};

export function buildCalendar(games: CalendarGame[], teamIds: string[]) {
  const calendar = ical({ name: "Blood Bowl" });

  for (const game of games) {
    if (!game.scheduledTime) {
      continue;
    }
    const gameTeamIds = [game.homeDetails, game.awayDetails].flatMap(
      (details) => (details ? [details.teamId] : []),
    );
    if (
      teamIds.length > 0 &&
      !gameTeamIds.some((teamId) => teamIds.includes(teamId))
    ) {
      continue;
    }
    calendar.createEvent({
      id: game.id,
      summary: `${game.awayDetails?.team.name ?? "TBD"} @ ${game.homeDetails?.team.name ?? "TBD"}`,
      start: game.scheduledTime,
      end: addHours(game.scheduledTime, 3),
    });
  }

  return calendar.toString();
}

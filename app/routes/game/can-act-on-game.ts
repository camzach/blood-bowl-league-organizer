import { isLeagueAdmin, type ActiveLeague } from "~/app/utils/permissions";

type Team = { coaches: Array<{ id: string }> };

export function canActOnGame(
  user: { id: string },
  activeLeague: ActiveLeague | null,
  game: {
    leagueId: string;
    homeDetails: { team: Team } | null;
    awayDetails: { team: Team } | null;
  },
): boolean {
  if (
    activeLeague &&
    isLeagueAdmin(activeLeague) &&
    game.leagueId === activeLeague.id
  ) {
    return true;
  }
  return [game.homeDetails, game.awayDetails].some((d) =>
    d?.team.coaches.some((c) => c.id === user.id),
  );
}

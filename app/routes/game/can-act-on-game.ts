import { isLeagueAdmin, type ActiveLeague } from "~/app/utils/permissions";

type Team = { leagueId: string; coaches: Array<{ id: string }> };

export function canActOnGame(
  user: { id: string },
  activeLeague: ActiveLeague | null,
  game: {
    homeDetails: { team: Team } | null;
    awayDetails: { team: Team } | null;
  },
): boolean {
  const details = [game.homeDetails, game.awayDetails];
  if (
    activeLeague &&
    isLeagueAdmin(activeLeague) &&
    details.every((d) => d?.team.leagueId === activeLeague.id)
  ) {
    return true;
  }
  return details.some((d) => d?.team.coaches.some((c) => c.id === user.id));
}

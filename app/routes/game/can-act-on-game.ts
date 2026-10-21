type Team = { coaches: Array<{ id: string }> };

export function canActOnGame(
  user: { id: string; role?: string | null },
  game: {
    homeDetails: { team: Team } | null;
    awayDetails: { team: Team } | null;
  },
): boolean {
  if (user.role === "admin") return true;
  return [game.homeDetails, game.awayDetails].some((details) =>
    details?.team.coaches.some((coach) => coach.id === user.id),
  );
}

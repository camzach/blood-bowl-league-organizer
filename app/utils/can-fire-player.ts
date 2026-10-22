export const MIN_ELIGIBLE_PLAYERS = 11;

type RosterPlayer = {
  id: string;
  membershipType: string | null;
  missNextGame: boolean;
};

export function canFirePlayer(
  teamState: string,
  players: RosterPlayer[],
  playerId: string,
) {
  if (teamState === "draft") return true;
  if (teamState !== "firing") return false;

  const player = players.find((p) => p.id === playerId);
  if (!player || player.membershipType !== "player") return true;

  const eligibleAfterFiring = players.filter(
    (p) =>
      p.id !== playerId && p.membershipType === "player" && !p.missNextGame,
  ).length;

  return eligibleAfterFiring >= MIN_ELIGIBLE_PLAYERS;
}

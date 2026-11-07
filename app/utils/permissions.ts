// Two separate kinds of "admin" exist in this app, and neither implies the other:
//
// - Global admin: `user.role === "admin"` (better-auth `admin()` plugin). A
//   platform-level role. It grants no authority inside any league.
// - League admin: the user's `member.role` in a league is "owner" or "admin".
//   Authority is limited to that one league.
//
// Each role field holds exactly one role (never a comma-separated list).

const LEAGUE_ADMIN_ROLES = ["owner", "admin"];

export type ActiveLeague = { id: string; role: string };

export function isLeagueAdmin(
  league: Pick<ActiveLeague, "role"> | null | undefined,
): boolean {
  return !!league && LEAGUE_ADMIN_ROLES.includes(league.role);
}

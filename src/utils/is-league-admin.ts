import { db } from "./drizzle";

export async function isLeagueAdmin(userId: string, leagueId: string) {
  const membership = await db.query.member.findFirst({
    where: { userId, leagueId },
  });

  if (!membership) return false;

  return membership.role === "admin" || membership.role === "owner";
}

import { and, eq } from "drizzle-orm";
import { db } from "./drizzle";
import { member } from "~/db/schema";

export async function isLeagueAdmin(userId: string, leagueId: string) {
  const membership = await db.query.member.findFirst({
    where: and(eq(member.userId, userId), eq(member.leagueId, leagueId)),
  });

  if (!membership) return false;

  return membership.role === "admin" || membership.role === "owner";
}

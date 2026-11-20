import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "~/app/utils/drizzle";
import { calendarFeed, member } from "~/db/schema";

export async function getOrCreateCalendarToken(
  userId: string,
  leagueId: string,
) {
  const [existing] = await db
    .select({ token: calendarFeed.token })
    .from(calendarFeed)
    .where(
      and(eq(calendarFeed.userId, userId), eq(calendarFeed.leagueId, leagueId)),
    );
  if (existing) {
    return existing.token;
  }

  await db
    .insert(calendarFeed)
    .values({ token: randomBytes(32).toString("base64url"), userId, leagueId })
    .onConflictDoNothing();

  const [created] = await db
    .select({ token: calendarFeed.token })
    .from(calendarFeed)
    .where(
      and(eq(calendarFeed.userId, userId), eq(calendarFeed.leagueId, leagueId)),
    );
  if (!created) {
    throw new Error("Could not create a calendar link");
  }
  return created.token;
}

export async function findCalendarFeedLeagueId(token: string) {
  const [feed] = await db
    .select({ leagueId: calendarFeed.leagueId })
    .from(calendarFeed)
    .innerJoin(
      member,
      and(
        eq(member.userId, calendarFeed.userId),
        eq(member.leagueId, calendarFeed.leagueId),
      ),
    )
    .where(eq(calendarFeed.token, token));
  return feed?.leagueId;
}

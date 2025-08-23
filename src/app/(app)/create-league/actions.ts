"use server";

import { auth } from "~/auth";
import { db } from "~/utils/drizzle";
import nanoid from "~/utils/nanoid";
import { redirect } from "next/navigation";
import { league, member } from "~/db/schema/auth";
import { headers } from "next/headers";

export async function createLeague(leagueName: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return redirect("/login");
  }

  const newLeagueId = nanoid();

  await db.transaction(async (tx) => {
    await tx.insert(league).values({
      id: newLeagueId,
      name: leagueName,
      slug: leagueName.toLowerCase().replace(/\s/g, "-"),
      createdAt: new Date(),
    });

    await tx.insert(member).values({
      id: nanoid(),
      userId: session.user.id,
      leagueId: newLeagueId,
      role: "admin",
      createdAt: new Date(),
    });
  });

  return redirect("/");
}

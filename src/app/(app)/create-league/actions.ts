"use server";

import { auth } from "~/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function createLeague(leagueName: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return redirect("/login");
  }

  await auth.api.createOrganization({
    headers: await headers(),
    body: {
      name: leagueName,
      slug: leagueName.toLowerCase().replace(/\s/g, "-"),
    },
  });

  return redirect("/");
}

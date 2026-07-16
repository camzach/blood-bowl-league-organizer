import { game as dbGame } from "~/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { PropsWithChildren } from "react";
import { db } from "~/utils/drizzle";
import { gameWithTeamNames } from "~/db/query-fragments/game.fragments";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ gameId: string }>;
}) {
  const params = await props.params;
  const game = await db.query.game.findFirst({
    where: eq(dbGame.id, params.gameId),
    ...gameWithTeamNames,
  });
  if (!game) return notFound();
  if (!game.homeDetails || !game.awayDetails) return notFound();
  return {
    title: `${game.awayDetails.team.name} @ ${game.homeDetails.team.name}`,
  };
}

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}

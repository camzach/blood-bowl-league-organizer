import { game as dbGame } from "db/schema";
import { eq } from "drizzle-orm";
import type { PropsWithChildren } from "react";
import { db } from "utils/drizzle";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { gameId: string };
}) {
  const game = await db.query.game.findFirst({
    where: eq(dbGame.id, params.gameId),
    with: { homeDetails: true, awayDetails: true },
  });
  return {
    title: `${game?.awayDetails.teamName} @ ${game?.homeDetails.teamName}`,
  };
}

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}

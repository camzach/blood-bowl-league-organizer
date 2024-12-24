import { game as dbGame } from "db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
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
    with: {
      homeDetails: { with: { team: { columns: { name: true } } } },
      awayDetails: { with: { team: { columns: { name: true } } } },
    },
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

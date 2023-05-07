import type { PropsWithChildren, ReactElement } from "react";
import { prisma } from "utils/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { gameId: string };
}) {
  const game = await prisma.game.findUniqueOrThrow({
    where: { id: params.gameId },
    select: { homeTeamName: true, awayTeamName: true },
  });
  return { title: `${game.awayTeamName} @ ${game.homeTeamName}` };
}

export default function Layout({ children }: PropsWithChildren): ReactElement {
  return <>{children}</>;
}

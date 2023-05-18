import { notFound, redirect } from "next/navigation";
import { trpc } from "utils/trpc";
import { prisma } from "utils/prisma";
import Content from "./content";

type InducementsResponseType = ReturnType<typeof trpc.inducements.list.query>;

export default async function Inducements({
  params: { gameId },
}: {
  params: { gameId: string };
}) {
  const game = await prisma.game.findUnique({
    where: { id: decodeURIComponent(gameId) },
    select: {
      state: true,
      home: { select: { treasury: true, name: true } },
      away: { select: { treasury: true, name: true } },
      pettyCashHome: true,
      pettyCashAway: true,
    },
  });
  if (!game) return notFound();

  if (game.state !== "Inducements")
    redirect(`game/${gameId}/${game.state.toLowerCase()}`);

  const inducements = await Promise.all(
    [game.home.name, game.away.name].map(async (team) =>
      trpc.inducements.list.query({ team })
    ) as [InducementsResponseType, InducementsResponseType]
  );

  return (
    <Content
      inducements={inducements}
      pettyCash={[game.pettyCashHome, game.pettyCashAway]}
      treasury={[game.home.treasury, game.away.treasury]}
      gameId={gameId}
    />
  );
}

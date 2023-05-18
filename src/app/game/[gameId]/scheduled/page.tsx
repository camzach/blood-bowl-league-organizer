import { prisma } from "utils/prisma";
import { PlayButton } from "./play-button";
import { notFound, redirect } from "next/navigation";

export default async function Game({
  params: { gameId },
}: {
  params: { gameId: string };
}) {
  const game = await prisma.game.findUnique({
    where: { id: decodeURIComponent(gameId) },
  });
  if (!game) return notFound();

  if (game.state !== "Scheduled")
    redirect(`game/${gameId}/${game.state.toLowerCase()}`);

  return <PlayButton gameId={gameId} />;
}

import { eq } from "drizzle-orm";
import { PlayButton } from "./play-button";
import { notFound, redirect } from "next/navigation";
import { db } from "utils/drizzle";
import { game as dbGame } from "db/schema";

export default async function Game({
  params: { gameId },
}: {
  params: { gameId: string };
}) {
  const game = await db.query.game.findFirst({
    where: eq(dbGame.id, gameId),
  });
  if (!game) return notFound();

  if (game.state !== "scheduled")
    redirect(`game/${gameId}/${game.state.toLowerCase()}`);

  return <PlayButton gameId={gameId} />;
}

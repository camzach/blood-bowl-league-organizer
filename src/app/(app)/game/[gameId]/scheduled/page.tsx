import { PlayButton } from "./play-button";
import { notFound, redirect } from "next/navigation";
import { db } from "~/utils/drizzle";

export default async function Game(props: {
  params: Promise<{ gameId: string }>;
}) {
  const params = await props.params;

  const { gameId } = params;

  const game = await db.query.game.findFirst({
    where: { id: gameId },
  });
  if (!game) return notFound();

  if (game.state !== "scheduled") {
    if (game.state === "complete") {
      redirect(`/game/${gameId}`);
    } else {
      redirect(
        `/game/${gameId}/${game.state.toLowerCase() as typeof game.state}`,
      );
    }
  }

  return <PlayButton gameId={gameId} />;
}

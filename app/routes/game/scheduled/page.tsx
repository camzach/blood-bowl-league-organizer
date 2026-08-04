import { PlayButton } from "./play-button";
import { redirect } from "react-router";
import { db } from "~/app/utils/drizzle";
import type { Route } from "./+types/page";

export async function loader({ params }: Route.LoaderArgs) {
  const { gameId } = params;

  const game = await db.query.game.findFirst({
    where: { id: gameId },
  });
  if (!game) throw new Response("Not Found", { status: 404 });

  if (game.state !== "scheduled") {
    if (game.state === "complete") {
      throw redirect(`/game/${gameId}`);
    } else {
      throw redirect(
        `/game/${gameId}/${game.state.toLowerCase() as typeof game.state}`,
      );
    }
  }

  return { gameId };
}

export default function ScheduledGame({ loaderData }: Route.ComponentProps) {
  return <PlayButton gameId={loaderData.gameId} />;
}

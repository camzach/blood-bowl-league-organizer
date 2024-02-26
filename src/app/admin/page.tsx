import { currentUser } from "@clerk/nextjs";
import { scheduleAction } from "./actions";
import { db } from "utils/drizzle";
import {
  game,
  gameDetails,
  gameDetailsToInducement,
  gameDetailsToStarPlayer,
  roundRobinGame,
  season,
} from "db/schema";
import seedDb from "db/seed";
import { eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";

export default async function AdminPage() {
  const user = await currentUser();

  if (!user?.publicMetadata.isAdmin) return notFound();

  return (
    <form>
      <button className="btn btn-primary" formAction={scheduleAction}>
        Begin Season
      </button>
      <button
        className="btn btn-warning"
        formAction={async () => {
          "use server";
          const seasonName = process.env.ACTIVE_SEASON;
          if (!seasonName) throw new Error("No active season");
          const gameIds = (
            await db
              .delete(roundRobinGame)
              .where(eq(roundRobinGame.seasonName, seasonName))
              .returning({ gameId: roundRobinGame.gameId })
          ).map((round) => round.gameId);
          await db.delete(season).where(eq(season.name, seasonName));
          if (gameIds.length === 0) return;
          const gameDetailsIds = (
            await db.delete(game).where(inArray(game.id, gameIds)).returning({
              homeDetails: game.homeDetailsId,
              awayDetails: game.awayDetailsId,
            })
          ).flatMap((game) => [game.homeDetails, game.awayDetails]);
          await Promise.all([
            db
              .delete(gameDetailsToInducement)
              .where(
                inArray(gameDetailsToInducement.gameDetailsId, gameDetailsIds),
              ),
            db
              .delete(gameDetailsToStarPlayer)
              .where(
                inArray(gameDetailsToStarPlayer.gameDetailsId, gameDetailsIds),
              ),
          ]);
          await db
            .delete(gameDetails)
            .where(inArray(gameDetails.id, gameDetailsIds));
        }}
      >
        Clear Season
      </button>
      <button formAction={seedDb} className="btn btn-accent">
        Seed Database
      </button>
    </form>
  );
}

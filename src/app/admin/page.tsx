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
import { eq, inArray } from "drizzle-orm";

export default async function AdminPage() {
  const user = await currentUser();

  if (!user?.publicMetadata.isAdmin) return "503";

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
    </form>
  );
}

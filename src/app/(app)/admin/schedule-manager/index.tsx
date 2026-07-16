import { league as dbLeague, roundRobinGame, season } from "~/db/schema";
import { eq } from "drizzle-orm";
import { db } from "~/utils/drizzle";
import ScheduleEditor from "./editor";
import { gameWithTeamNames } from "~/db/query-fragments/game.fragments";

type Props = {
  leagueId: string;
};
export default async function ScheduleManager({ leagueId }: Props) {
  const league = await db.query.league.findFirst({
    where: eq(dbLeague.id, leagueId),
    with: {
      seasons: {
        where: eq(season.isActive, true),
        with: {
          roundRobinGames: {
            with: { game: gameWithTeamNames },
            orderBy: roundRobinGame.round,
          },
          bracketGames: { with: { game: gameWithTeamNames } },
        },
      },
    },
  });

  if (!league) return "Couldn't find the league";
  const activeSeason = league.seasons[0];
  if (!activeSeason) return "No active season";

  return (
    <ScheduleEditor
      games={activeSeason.roundRobinGames
        .filter((g) => g.game.homeDetails && g.game.awayDetails)
        .map((g) => ({
          round: g.round,
          id: g.gameId,
          homeTeam: g.game.homeDetails?.team.name,
          awayTeam: g.game.awayDetails?.team.name,
          time: g.game.scheduledTime,
        }))}
    />
  );
}

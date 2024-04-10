import { league as dbLeague, roundRobinGame, season } from "db/schema";
import { eq } from "drizzle-orm";
import { db } from "utils/drizzle";
import ScheduleEditor from "./editor";

const gameFields = {
  with: {
    homeDetails: { with: { team: { columns: { name: true } } } },
    awayDetails: { with: { team: { columns: { name: true } } } },
  },
} as const;

type Props = {
  leagueName: string;
};
export default async function ScheduleManager({ leagueName }: Props) {
  const league = await db.query.league.findFirst({
    where: eq(dbLeague.name, leagueName),
    with: {
      seasons: {
        where: eq(season.isActive, true),
        with: {
          roundRobinGames: {
            with: { game: gameFields },
            orderBy: roundRobinGame.round,
          },
          bracketGames: { with: { game: gameFields } },
        },
      },
    },
  });

  if (!league) return "Couldn't find the league";
  const activeSeason = league.seasons[0];
  if (!activeSeason) return "No active season";

  return (
    <ScheduleEditor
      games={activeSeason.roundRobinGames.map((g) => ({
        round: g.round,
        id: g.gameId,
        homeTeam: g.game.homeDetails.team.name,
        awayTeam: g.game.awayDetails.team.name,
        time: g.game.scheduledTime,
      }))}
    />
  );
}

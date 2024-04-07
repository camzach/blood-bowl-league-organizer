import classNames from "classnames";
import { league as dbLeague, roundRobinGame, season } from "db/schema";
import { eq } from "drizzle-orm";
import { db } from "utils/drizzle";

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

  type Game = (typeof activeSeason.roundRobinGames)[number];
  const blockedMap = new WeakMap<Game, boolean>();
  const blockedBy = new Map<Game, Game[]>();
  for (const game of activeSeason.roundRobinGames) {
    const time = game.game.scheduledTime && new Date(game.game.scheduledTime);
    const dependencies = activeSeason.roundRobinGames.filter(
      (g) =>
        g.round === game.round - 1 &&
        [game.game.homeDetails.teamId, game.game.awayDetails.teamId].some(
          (tid) =>
            [g.game.homeDetails.teamId, g.game.awayDetails.teamId].includes(
              tid,
            ),
        ),
    );
    const blockers = dependencies.filter(
      (dep) =>
        blockedMap.get(dep) ||
        (time &&
          dep.game.scheduledTime &&
          new Date(dep.game.scheduledTime) > time),
    );
    blockedMap.set(game, blockers.length > 0 || !time);
    blockedBy.set(game, blockers);
  }

  return (
    <table className={classNames("table table-zebra-zebra")}>
      <thead>
        <tr>
          <th>round</th>
          <th>Home</th>
          <th>Away</th>
          <th>Date</th>
          <th>Blocked By</th>
        </tr>
      </thead>
      <tbody>
        {league.seasons[0].roundRobinGames.map((game) => {
          return (
            <tr
              key={game.gameId}
              className={classNames(blockedMap.get(game) && "!bg-red-800")}
            >
              <td>{game.round}</td>
              <td>{game.game.awayDetails.team.name}</td>
              <td>{game.game.homeDetails.team.name}</td>
              <td>
                <input
                  type="date"
                  value={game.game.scheduledTime?.toISOString().split("T")[0]}
                />
                <input
                  type="time"
                  value={game.game.scheduledTime?.toTimeString().split(" ")[0]}
                />
              </td>
              <td>
                {blockedBy
                  .get(game)
                  ?.map(
                    (g) =>
                      `${g.game.awayDetails.team.name} @ ${g.game.homeDetails.team.name}`,
                  )
                  .join(",")}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

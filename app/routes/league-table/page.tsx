import { activeLeagueContext } from "~/app/primary-layout";
import type { Route } from "./+types/page";
import fetchLeagueTable from "./fetch-league-table";
import { sortLeagueTable } from "~/app/utils/league-table";

export async function loader({ context }: Route.LoaderArgs) {
  const table = await fetchLeagueTable(
    context.get(activeLeagueContext)?.id ?? "",
  );

  return { table };
}

export default function Page({ loaderData }: Route.ComponentProps) {
  const { table } = loaderData;

  return (
    <table className="table-zebra mx-auto table w-3/5">
      <thead>
        <tr>
          <th>Team</th>
          <th>League Points</th>
          <th>Wins</th>
          <th>Losses</th>
          <th>Draws</th>
          <th>Touchdowns</th>
          <th>TD Difference</th>
          <th>Casualties</th>
          <th>Cas Difference</th>
        </tr>
      </thead>
      <tbody>
        {sortLeagueTable(table).map(([teamId, stats]) => (
          <tr key={teamId}>
            <td>{stats.name}</td>
            <td>{stats.points}</td>
            <td>{stats.wins}</td>
            <td>{stats.losses}</td>
            <td>{stats.draws}</td>
            <td>{stats.td}</td>
            <td>{stats.tdDiff}</td>
            <td>{stats.cas}</td>
            <td>{stats.casDiff}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

import type { Metadata } from "next/types";
import { getLeagueTable } from "~/utils/get-league-table";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "League Table" };

export default async function Page() {
  const table = await getLeagueTable();

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
        {Object.entries(table)
          .sort(([, a], [, b]) => {
            if (a.points !== b.points) return b.points - a.points;
            // Tiebreakers
            if (a.tdDiff !== b.tdDiff) return b.tdDiff - a.tdDiff;
            if (a.casDiff !== b.casDiff) return b.casDiff - a.casDiff;
            if (a.tdDiff + a.casDiff !== b.tdDiff + b.casDiff)
              return b.tdDiff + b.casDiff - (a.tdDiff + b.casDiff);
            return 0;
          })
          .map(([teamId, stats]) => (
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

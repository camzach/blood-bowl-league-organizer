import type { ReactElement } from "react";
import { trpc } from "utils/trpc";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "League Table" };

export default async function Page(): Promise<ReactElement> {
  const table = await trpc.schedule.leagueTable.query();
  return (
    <table className="border-collapse">
      <thead className="sticky top-1 bg-gray-400">
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
      <tbody
        className={`
        [&>tr:hover]:bg-orange-200 [&>tr:not(:first-child)]:border-t-2
        [&>tr:not(:first-child)]:border-t-gray-400 [&_td:not(:first-child)]:border-l-2
        [&_td:not(:first-child)]:border-l-gray-300
      `}
      >
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
          .map(([team, stats]) => (
            <tr key={team}>
              <td>{team}</td>
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

import { authContext } from "~/app/protected-route";
import type { Route } from "./+types/page";
// import { notFound, redirect } from "next/navigation";
import calculateTV from "~/app/utils/calculate-tv";
// import SongControls from "./[teamId]/touchdown-song-controlss";
import { TeamTable } from "~/app/components/team-table";
import EditButton from "./edit-button";
import SongControls from "./touchdown-song-controls";

export default function Component({ matches }: Route.ComponentProps) {
  const { team, isEditable } = matches[2].loaderData;

  return (
    <>
      <h1 className="text-4xl">
        {team.name}
        {isEditable &&
          (team.state === "draft" ||
            team.state === "hiring" ||
            team.state === "improving") && <EditButton teamId={team.id} />}
      </h1>
      <div className="my-4 flex flex-col text-lg">
        <span>TV - {calculateTV(team).toLocaleString()}</span>
        <span>
          Current TV -{" "}
          {calculateTV({
            ...team,
            players: team.players.filter((p) => !p.missNextGame),
          }).toLocaleString()}
        </span>
      </div>
      Treasury -- {team.treasury}
      <br />
      Dedicated Fans -- {team.dedicatedFans}
      <SongControls
        teamId={team.id}
        currentSong={team.touchdownSong ?? undefined}
        isEditable={false}
      />
      <TeamTable players={team.players} />
      <table>
        <thead>
          <tr>
            <th />
            <th>Cost</th>
            <th>Count</th>
            <th>Team Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Rerolls</td>
            <td>
              {team.state === "draft"
                ? team.roster.rerollCost.toLocaleString()
                : (team.roster.rerollCost * 2).toLocaleString()}
            </td>
            <td>{team.rerolls}</td>
            <td>{(team.rerolls * team.roster.rerollCost).toLocaleString()}</td>
          </tr>
          <tr>
            <td>Assistant Coaches</td>
            <td>10,000</td>
            <td>{team.assistantCoaches}</td>
            <td>{(team.assistantCoaches * 10000).toLocaleString()}</td>
          </tr>
          <tr>
            <td>Cheerleaders</td>
            <td>10,000</td>
            <td>{team.cheerleaders}</td>
            <td>{team.cheerleaders * 10000}</td>
          </tr>
          <tr>
            <td>Apothecary</td>
            <td>50,000</td>
            <td>
              <input
                type="checkbox"
                className="checkbox"
                checked={team.apothecary}
                disabled
              />
            </td>
            <td>{(team.apothecary ? 50_000 : 0).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

import { notFound, redirect } from "next/navigation";
import React from "react";
import calculateTV from "utils/calculate-tv";
import SongControls from "./touchdown-song-controls";
import type { Metadata } from "next";
import { TeamTable } from "components/team-table";
import EditButton from "./edit-button";
import { db } from "utils/drizzle";
import { eq } from "drizzle-orm";
import { coachToTeam, team as dbTeam } from "db/schema";
import fetchTeam from "./fetch-team";
import { auth } from "auth";
import { headers } from "next/headers";

type Props = { params: { teamId: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const routeTeam = await db.query.team.findFirst({
    where: eq(dbTeam.id, params.teamId),
    columns: { name: true },
  });
  return { title: routeTeam?.name ?? "Unknown Team" };
}

export default async function TeamPage({ params: { teamId } }: Props) {
  const apiSession = await auth.api.getSession({ headers: headers() });
  if (!apiSession) {
    return redirect("/login");
  }
  const { user, session } = apiSession;

  const team = await fetchTeam(decodeURIComponent(teamId), false);

  if (!team || team.leagueName !== (session.activeOrganizationId as string)) {
    return notFound();
  }

  const editableTeams = await db.query.coachToTeam.findMany({
    where: eq(coachToTeam.coachId, user.id),
  });

  return (
    <>
      <h1 className="text-4xl">
        {team.name}
        {editableTeams.some((entry) => entry.teamId === team.id) &&
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

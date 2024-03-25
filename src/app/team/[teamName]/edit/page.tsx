import { notFound, redirect } from "next/navigation";
import React from "react";
import { HireablePlayerManager } from "./hireable-player-manager";
import { PlayerHirer } from "./player-hirer";
import StaffHirer from "./staff-hirer";
import calculateTV from "utils/calculate-tv";
import ReadyTeam from "./ready-team";
import SongControls from "../touchdown-song-controls";
import type { Metadata } from "next";
import { TeamTable } from "components/team-table";
import { PlayerActions } from "./player-controls/action-buttons";
import PlayerNumberSelector from "./player-controls/player-number-selector";
import PlayerNameEditor from "./player-controls/player-name-editor";
import fetchTeam from "../fetch-team";
import { RedirectToSignIn, currentUser } from "@clerk/nextjs";
import { db } from "utils/drizzle";
import { coachToTeam, rosterSlot } from "db/schema";
import { eq } from "drizzle-orm";
import DoneImproving from "./done-improving";

type Props = { params: { teamName: string } };

export function generateMetadata({ params }: Props): Metadata {
  return { title: decodeURIComponent(params.teamName) };
}

export default async function EditTeam({ params: { teamName } }: Props) {
  const user = await currentUser();

  if (!user) return <RedirectToSignIn />;
  const editableTeams = await db.query.coachToTeam.findMany({
    where: eq(coachToTeam.coachId, user.id),
  });
  if (
    !editableTeams.some(
      (entry) =>
        entry.teamName === decodeURIComponent(teamName) &&
        entry.coachId === user.id,
    )
  ) {
    return redirect(`/teams/${teamName}`);
  }
  const team = await fetchTeam(
    decodeURIComponent(teamName),
    user.publicMetadata.league as string,
    true,
  );
  const skills = await db.query.skill.findMany({});

  if (!team) return notFound();

  const state = team.state;
  if (state === "ready" || state === "playing")
    return redirect(`/team/${team.name}`);

  const rosterSlots = await db.query.rosterSlot.findMany({
    where: eq(rosterSlot.rosterName, team.rosterName),
    with: { position: true },
  });

  const freeNumbers = Array.from(new Array(16), (_, idx) => idx + 1).filter(
    (n) =>
      !team.players.some(
        (p) => p.membershipType === "player" && p.number === n,
      ),
  );

  return (
    <>
      <h1 className="text-4xl">{team.name}</h1>
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
      Dedicated Fans --{" "}
      <StaffHirer
        title={"Dedicated Fans"}
        type={"dedicatedFans"}
        current={team.dedicatedFans}
        cost={10_000}
        teamName={team.name}
        treasury={team.treasury}
        max={6}
      />
      <SongControls
        team={team.name}
        currentSong={team.touchdownSong ?? undefined}
        isEditable={true}
      />
      <TeamTable
        players={team.players.filter((p) => p.membershipType === "player")}
        cols={[
          { id: "#", name: "#", Component: PlayerNumberSelector },
          { id: "name", name: "Name", Component: PlayerNameEditor },
          "position",
          "skills",
          "ma",
          "st",
          "pa",
          "ag",
          "av",
          "ni",
          "mng",
          "spp",
          "tv",
          {
            id: "Actions",
            name: "Actions",
            Component: (player) => (
              <PlayerActions player={player} skills={skills} state={state} />
            ),
          },
        ]}
      />
      <div className="my-2">
        <PlayerHirer
          positions={rosterSlots
            .filter(
              (slot) =>
                team.players.filter((p) =>
                  slot.position.some((pos) => pos.id === p.position.id),
                ).length < slot.max,
            )
            .flatMap((slot) => slot.position)}
          treasury={team.treasury}
          freeNumbers={freeNumbers}
          teamName={team.name}
        />
      </div>
      <HireablePlayerManager
        players={team.players.filter((p) => p.membershipType !== "player")}
        freeNumbers={freeNumbers}
        skills={skills}
        state={state}
      />
      <table>
        <thead>
          <tr>
            <th />
            <th>Cost</th>
            <th>Count</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Rerolls</td>
            <td>
              {team.roster.rerollCost.toLocaleString()} /{" "}
              {(team.roster.rerollCost * 2).toLocaleString()}
            </td>
            <td>
              <StaffHirer
                teamName={team.name}
                type={"rerolls"}
                title={"Rerolls"}
                treasury={team.treasury}
                current={team.rerolls}
                cost={
                  team.state === "draft"
                    ? team.roster.rerollCost
                    : team.roster.rerollCost * 2
                }
                max={6}
              />
            </td>
            <td>{(team.rerolls * team.roster.rerollCost).toLocaleString()}</td>
          </tr>
          <tr>
            <td>Assistant Coaches</td>
            <td>10,000</td>
            <td>
              <StaffHirer
                teamName={team.name}
                type={"assistantCoaches"}
                title={"Assistant Coaches"}
                treasury={team.treasury}
                current={team.assistantCoaches}
                cost={10_000}
                max={10}
              />
            </td>
            <td>{(team.assistantCoaches * 10000).toLocaleString()}</td>
          </tr>
          <tr>
            <td>Cheerleaders</td>
            <td>10,000</td>
            <td>
              <StaffHirer
                teamName={team.name}
                type={"cheerleaders"}
                title={"Cheerleaders"}
                treasury={team.treasury}
                current={team.cheerleaders}
                cost={10_000}
                max={10}
              />
            </td>
            <td>{team.cheerleaders * 10000}</td>
          </tr>
          <tr>
            <td>Apothecary</td>
            <td>50,000</td>
            <td>
              <StaffHirer
                teamName={team.name}
                type={"apothecary"}
                title={"Apothecary"}
                current={Number(team.apothecary)}
                cost={50_000}
                treasury={team.treasury}
                max={1}
              />
            </td>
            <td>{(team.apothecary ? 50_000 : 0).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
      {team.state === "improving" ? (
        <DoneImproving team={team.name} />
      ) : (
        <ReadyTeam team={team.name} />
      )}
    </>
  );
}

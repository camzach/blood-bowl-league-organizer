import { notFound, redirect } from "next/navigation";
import React from "react";
// import { HireablePlayerManager } from "./hireable-player-manager";
import { PlayerHirer } from "./player-hirer";
import StaffHirer from "./staff-hirer";
import calculateTV from "utils/calculate-tv";
// import ReadyTeam from "./ready-team";
import SongControls from "../touchdown-song-controls";
import type { Metadata } from "next";
import { TeamTable } from "components/team-table";
import { PlayerActions } from "./player-controls/action-buttons";
import PlayerNumberSelector from "./player-controls/player-number-selector";
import PlayerNameEditor from "./player-controls/player-name-editor";
import fetchTeam from "../fetch-team";
import { RedirectToSignIn, auth } from "@clerk/nextjs";
import drizzle from "utils/drizzle";
import { coachToTeam, rosterSlot } from "db/schema";
import { eq } from "drizzle-orm";
import { fireStaff, hirePlayer, hireStaff } from "./actions";

type Props = { params: { teamName: string } };

export function generateMetadata({ params }: Props): Metadata {
  return { title: decodeURIComponent(params.teamName) };
}

export default async function EditTeam({ params: { teamName } }: Props) {
  const { userId } = auth();

  if (!userId) return <RedirectToSignIn />;
  const editableTeams = await drizzle.query.coachToTeam.findMany({
    where: eq(coachToTeam.coachId, userId),
  });
  if (
    !editableTeams.some(
      (entry) =>
        entry.teamName === decodeURIComponent(teamName) &&
        entry.coachId === userId
    )
  ) {
    return redirect(`/teams/${teamName}`);
  }
  const team = await fetchTeam(decodeURIComponent(teamName));
  const skills = await drizzle.query.skill.findMany({});

  if (!team) return notFound();

  const rosterSlots = await drizzle.query.rosterSlot.findMany({
    where: eq(rosterSlot.rosterName, team.rosterName),
    with: { position: true },
  });

  const freeNumbers = Array.from(new Array(16), (_, idx) => idx + 1).filter(
    (n) => !team.players.some((p) => p.number === n)
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
        hireStaffAction={hireStaff}
        fireStaffAction={fireStaff}
      />
      <SongControls
        team={team.name}
        currentSong={team.touchdownSong ?? undefined}
        isEditable={true}
      />
      <TeamTable
        players={team.players}
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
          team.state === "improving" ? "Spend SPP" : "spp",
          "tv",
          {
            id: "Actions",
            name: "Actions",
            Component: (player) => (
              <PlayerActions player={player} skills={skills} />
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
                  slot.position.some((pos) => pos.id === p.position.id)
                ).length < slot.max
            )
            .flatMap((slot) => slot.position)}
          treasury={team.treasury}
          freeNumbers={freeNumbers}
          teamName={team.name}
          hirePlayerAction={hirePlayer}
        />
      </div>
      {/* {team.journeymen.length > 0 && (
        <HireablePlayerManager
          players={team.journeymen}
          freeNumbers={freeNumbers}
          teamName={team.name}
          skills={skills}
          from="journeymen"
        />
      )}
      {team.redrafts.length > 0 && (
        <HireablePlayerManager
          players={team.redrafts}
          freeNumbers={freeNumbers}
          teamName={team.name}
          skills={skills}
          from="redrafts"
        />
      )} */}
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
                hireStaffAction={hireStaff}
                fireStaffAction={fireStaff}
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
                hireStaffAction={hireStaff}
                fireStaffAction={fireStaff}
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
                hireStaffAction={hireStaff}
                fireStaffAction={fireStaff}
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
                hireStaffAction={hireStaff}
                fireStaffAction={fireStaff}
              />
            </td>
            <td>{(team.apothecary ? 50_000 : 0).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
      {/* <ReadyTeam team={team.name} /> */}
    </>
  );
}

import { notFound, redirect } from "next/navigation";
import { prisma } from "utils/prisma";
import React from "react";
import { HireablePlayerManager } from "./hireable-player-manager";
import { PlayerHirer } from "./player-hirer";
import StaffHirer from "./staff-hirer";
import calculateTV from "utils/calculate-tv";
import ReadyTeam from "./ready-team";
import { TeamState } from "@prisma/client";
import SongControls from "../touchdown-song-controls";
import type { Metadata } from "next";
import { TeamTable } from "components/team-table";
import { PlayerActions } from "components/team-table/player-actions/action-buttons";
import PlayerNumberSelector from "components/team-table/player-actions/player-number-selector";
import PlayerNameEditor from "components/team-table/player-actions/palyer-name-editor";
import { getServerSession } from "next-auth";
import { authOptions } from "pages/api/auth/[...nextauth]";

type Props = { params: { teamName: string } };

export function generateMetadata({ params }: Props): Metadata {
  return { title: decodeURIComponent(params.teamName) };
}

async function fetchTeam(teamName: string) {
  return prisma.team.findUnique({
    where: { name: teamName },
    include: {
      roster: { include: { positions: true } },
      players: {
        include: { skills: { include: { faq: true } }, position: true },
      },
      journeymen: {
        include: { skills: { include: { faq: true } }, position: true },
      },
      redrafts: {
        include: { skills: { include: { faq: true } }, position: true },
      },
      touchdownSong: { select: { name: true } },
    },
  });
}
export type FetchedTeamType = NonNullable<
  Awaited<ReturnType<typeof fetchTeam>>
>;

export default async function EditTeam({ params: { teamName } }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user.teams.includes(teamName))
    return redirect(`/team/${teamName}`);
  const team = await fetchTeam(decodeURIComponent(teamName));
  const skills = await prisma.skill.findMany({});

  if (!team) return notFound();

  const freeNumbers = Array.from(new Array(16), (_, idx) => idx + 1).filter(
    (n) => !team.players.some((p) => p.number === n)
  );

  return (
    <div className="min-w-0">
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
        currentSong={team.touchdownSong?.name}
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
          "spp",
          "tv",
          { id: "Actions", name: "Actions", Component: PlayerActions },
        ]}
      />
      <PlayerHirer
        positions={team.roster.positions.filter(
          (pos) =>
            team.players.filter((p) => p.position.name === pos.name).length <
            pos.max
        )}
        treasury={team.treasury}
        freeNumbers={freeNumbers}
        teamName={team.name}
      />
      {team.journeymen.length > 0 && (
        <HireablePlayerManager
          players={team.journeymen}
          freeNumbers={freeNumbers}
          teamName={team.name}
          skills={skills}
        />
      )}
      {team.redrafts.length > 0 && (
        <HireablePlayerManager
          players={team.redrafts}
          freeNumbers={freeNumbers}
          teamName={team.name}
          skills={skills}
        />
      )}
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
                  team.state === TeamState.Draft
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
      <ReadyTeam team={team.name} />
    </div>
  );
}

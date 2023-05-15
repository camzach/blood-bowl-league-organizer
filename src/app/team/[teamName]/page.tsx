import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { prisma } from "utils/prisma";
import React from "react";
import calculateTV from "utils/calculate-tv";
import SongControls from "./touchdown-song-controls";
import type { Metadata } from "next";
import { TeamTable } from "components/team-table";

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

export default async function TeamPage({
  params: { teamName },
}: Props): Promise<ReactElement> {
  const team = await fetchTeam(decodeURIComponent(teamName));

  if (!team) return notFound();

  return (
    <div>
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
      Dedicated Fans -- {team.dedicatedFans}
      <SongControls
        team={team.name}
        currentSong={team.touchdownSong?.name}
        isEditable={false}
      />
      <TeamTable players={team.players} />
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
              <input type="checkbox" checked={team.apothecary} disabled />
            </td>
            <td>{(team.apothecary ? 50_000 : 0).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

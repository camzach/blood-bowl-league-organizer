import { notFound } from "next/navigation";
import React from "react";
import calculateTV from "utils/calculate-tv";
import SongControls from "./touchdown-song-controls";
import type { Metadata } from "next";
import { TeamTable } from "components/team-table";
import EditButton from "./edit-button";
import drizzle from "utils/drizzle";
import { eq } from "drizzle-orm";
import { coachToTeam, team as dbTeam } from "db/schema";
import {
  getPlayerSkills,
  getPlayerSppAndTv,
  getPlayerStats,
} from "utils/get-computed-player-fields";
import { RedirectToSignIn, auth } from "@clerk/nextjs";

type Props = { params: { teamName: string } };

export function generateMetadata({ params }: Props): Metadata {
  return { title: decodeURIComponent(params.teamName) };
}

export default async function TeamPage({ params: { teamName } }: Props) {
  const { userId } = auth();
  if (!userId) return <RedirectToSignIn />;

  const fetchedTeam = await drizzle.query.team.findFirst({
    where: eq(dbTeam.name, decodeURIComponent(teamName)),
    with: {
      roster: true,
      players: {
        with: {
          improvements: { with: { skill: true } },
          position: {
            with: {
              skillToPosition: { with: { skill: true } },
              skillCategories: true,
              rosterSlot: {
                with: {
                  roster: {
                    with: {
                      specialRuleToRoster: { with: { specialRule: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!fetchedTeam) return notFound();

  const editableTeams = await drizzle.query.coachToTeam.findMany({
    where: eq(coachToTeam.coachId, userId),
  });

  const team = {
    ...fetchedTeam,
    players: fetchedTeam.players.map((p) => {
      const position = {
        ...p.position,
        skills: p.position.skillToPosition.map((stp) => stp.skill),
        primary: p.position.skillCategories
          .filter((c) => c.type === "primary")
          .map((c) => c.skillCategoryName),
        secondary: p.position.skillCategories
          .filter((c) => c.type === "secondary")
          .map((c) => c.skillCategoryName),
        roster: {
          ...p.position.rosterSlot.roster,
          specialRules: p.position.rosterSlot.roster.specialRuleToRoster.map(
            (sr) => sr.specialRule
          ),
        },
      };
      return {
        ...p,
        ...getPlayerStats(p),
        ...getPlayerSppAndTv({ ...p, position }),
        position,
        skills: getPlayerSkills({ ...p, position }),
      };
    }),
  };

  return (
    <>
      <h1 className="text-4xl">
        {team.name}
        {editableTeams.some((entry) => entry.teamName === team.name) && (
          <EditButton teamName={team.name} />
        )}
      </h1>
      <div className="my-4 flex flex-col text-lg">
        <span>TV - unknown</span>
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

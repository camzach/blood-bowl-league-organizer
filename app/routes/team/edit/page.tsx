import { HireablePlayerManager } from "./hireable-player-manager";
import { PlayerHirer } from "./player-hirer";
import StaffHirer from "./staff-hirer";
import calculateTV from "~/app/utils/calculate-tv";
import SongControls from "../view/touchdown-song-controls";
import { TeamTable } from "~/app/components/team-table";
import { PlayerActions } from "./player-controls/action-buttons";
import PlayerNumberSelector from "./player-controls/player-number-selector";
import PlayerNameEditor from "./player-controls/player-name-editor";
import { db } from "~/app/utils/drizzle";
import TeamState from "./team-state";
import { useCallback } from "react";

import { Route } from "./+types/page";
import { redirect } from "react-router";

export async function loader() {
  const skills = await db.query.skill.findMany({});

  const skillRelations = await db.query.skillRelation.findMany({});

  return { skills, skillRelations };
}

export default function EditTeam({
  matches,
  loaderData,
}: Route.ComponentProps) {
  const { team } = matches[2].loaderData;
  const { skills, skillRelations } = loaderData;

  const state = team.state;
  if (state === "ready" || state === "playing")
    return redirect(`/team/${team.id}`);

  const freeNumbers = Array.from(new Array(16), (_, idx) => idx + 1).filter(
    (n) =>
      !team.players.some(
        (p) => p.membershipType === "player" && p.number === n,
      ),
  );

  const hirablePlayers = team.players.filter((p) =>
    team.state === "draft"
      ? p.membershipType === "retired"
      : p.membershipType === "journeyman",
  );

  const hasCaptainRule = team.roster.specialRules.some(
    (r) => r.name === "Team Captain",
  );

  const currentCaptain = team.players.find((p) => p.isCaptain);

  const PlayerActionsComponent = useCallback(
    (player: typeof team.players[number]) => (
      <PlayerActions
        player={player}
        skills={skills}
        state={state}
        skillRelations={skillRelations}
        hasCaptainRule={hasCaptainRule}
        currentCaptainId={currentCaptain?.id}
        teamId={team.id}
      />
    ),
    [skills, state, skillRelations, hasCaptainRule, currentCaptain?.id, team.id],
  );

  const PlayerNumberSelectorComponent = useCallback(
    (player: typeof team.players[number]) => (
      <PlayerNumberSelector
        id={player.id}
        number={player.number}
        teamId={team.id}
      />
    ),
    [team.id],
  );

  const PlayerNameEditorComponent = useCallback(
    (player: typeof team.players[number]) => (
      <PlayerNameEditor
        id={player.id}
        name={player.name}
        teamId={team.id}
      />
    ),
    [team.id],
  );

  return (
    <>
      <h1 className="text-4xl">{team.name}</h1>
      {(team.state === "draft" ||
        team.state === "hiring" ||
        team.state === "improving") && (
        <TeamState
          state={team.state}
          id={team.id}
          treasury={team.treasury}
          blocked={team.players.some(
            (p) => p.pendingRandomStat || p.pendingRandomSkill,
          )}
        />
      )}
      <div className="my-4 flex flex-col text-lg">
        <span>TV - {calculateTV(team).toLocaleString()}</span>
        <span>
          Current TV -{" "}
          {calculateTV({
            ...team,
            players: team.players.filter(
              (p) => !p.missNextGame && p.membershipType === "player",
            ),
          }).toLocaleString()}
        </span>
      </div>
      Treasury -- {team.treasury}
      <br />
      Dedicated Fans --{" "}
      {team.state === "draft" ? (
        <StaffHirer
          title={"Dedicated Fans"}
          type={"dedicatedFans"}
          current={team.dedicatedFans}
          cost={10_000}
          teamId={team.id}
          treasury={team.treasury}
          min={1}
          max={6}
        />
      ) : (
        team.dedicatedFans
      )}
      <SongControls
        teamId={team.id}
        currentSong={team.touchdownSong ?? undefined}
        isEditable={true}
      />
      <TeamTable
        players={team.players.filter((p) => p.membershipType === "player")}
        cols={[
          { id: "#", name: "#", Component: PlayerNumberSelectorComponent },
          { id: "name", name: "Name", Component: PlayerNameEditorComponent },
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
            Component: PlayerActionsComponent,
          },
        ]}
      />
      <div className="my-2">
        <PlayerHirer
          disabled={state !== "hiring" && state !== "draft"}
          positions={team.roster.rosterSlots
            .filter(
              (slot) =>
                team.players.filter((p) =>
                  slot.position.some((pos) => pos.id === p.position.id),
                ).length < slot.max,
            )
            .flatMap((slot) => slot.position)}
          treasury={team.treasury}
          freeNumbers={freeNumbers}
          teamId={team.id}
        />
      </div>
      {hirablePlayers.length > 0 && (
        <HireablePlayerManager
          players={hirablePlayers}
          freeNumbers={freeNumbers}
          skills={skills}
          skillRelations={skillRelations}
          state={state}
          teamId={team.id}
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
                disabled={team.state !== "hiring" && state !== "draft"}
                teamId={team.id}
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
                disabled={team.state !== "hiring" && state !== "draft"}
                teamId={team.id}
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
                disabled={team.state !== "hiring" && state !== "draft"}
                teamId={team.id}
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
                disabled={team.state !== "hiring" && state !== "draft"}
                teamId={team.id}
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
    </>
  );
}

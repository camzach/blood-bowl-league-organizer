import { TeamTable } from "~/app/components/team-table";
import type { ComponentProps } from "react";
import ScoreWidget from "./score-widget";
import { redirect } from "react-router";
import StarPlayerTable from "./star-player-table";
import {
  getPlayerStats,
  getPlayerSkills,
  getPlayerSppAndTv,
} from "~/app/utils/get-computed-player-fields";
import { db } from "~/app/utils/drizzle";
import { gameDetailsWithFullTeam } from "~/db/query-fragments/game.fragments";
import { InProgressData } from "../loader";

const cols = [
  "number",
  "name",
  "position",
  "skills",
  "ma",
  "st",
  "av",
  "ag",
  "pa",
] satisfies ComponentProps<typeof TeamTable>["cols"];
const journeymanCols = [
  "number",
  "position",
  "skills",
  "ma",
  "st",
  "av",
  "ag",
  "pa",
] satisfies ComponentProps<typeof TeamTable>["cols"];

type Props = { loaderData: InProgressData };
export default function InProgress({ loaderData }: Props) {
  const { gameId, home, away } = loaderData;

  return (
    <div
      className="mx-auto grid w-4/5 auto-cols-fr grid-cols-2 gap-3 gap-x-12"
      style={{ placeItems: "start center" }}
    >
      <ScoreWidget
        gameId={gameId}
        home={{
          name: home.name,
          id: home.id,
          song: home.song,
          rerolls: home.rerolls,
          fanFactor: home.fanFactor,
          assistantCoaches: home.assistantCoaches,
          cheerleaders: home.cheerleaders,
          players: home.players.map((p) => ({
            id: p.id,
            name: p.name,
            number: p.number,
            missNextGame: p.missNextGame,
            keywords: p.keywords,
            nigglingInjuries: p.nigglingInjuries,
          })),
          journeymen: home.journeymen.map((p) => ({
            id: p.id,
            name: p.name,
            number: p.number,
            missNextGame: p.missNextGame,
            keywords: p.keywords,
            nigglingInjuries: p.nigglingInjuries,
          })),
          starPlayers: home.starPlayers,
        }}
        away={{
          name: away.name,
          id: away.id,
          song: away.song,
          rerolls: away.rerolls,
          fanFactor: away.fanFactor,
          assistantCoaches: away.assistantCoaches,
          cheerleaders: away.cheerleaders,
          players: away.players.map((p) => ({
            id: p.id,
            name: p.name,
            number: p.number,
            missNextGame: p.missNextGame,
            keywords: p.keywords,
            nigglingInjuries: p.nigglingInjuries,
          })),
          journeymen: away.journeymen.map((p) => ({
            id: p.id,
            name: p.name,
            number: p.number,
            missNextGame: p.missNextGame,
            keywords: p.keywords,
            nigglingInjuries: p.nigglingInjuries,
          })),
          starPlayers: away.starPlayers,
        }}
      />

      <div className="flex flex-1 flex-col">
        <TeamTable compact players={home.players} cols={cols} />
        {home.journeymen.length > 0 && (
          <>
            <div className="divider">Journeymen</div>
            <TeamTable
              compact
              players={home.journeymen}
              cols={journeymanCols}
            />
          </>
        )}
        {home.starPlayers.length > 0 && (
          <>
            <div className="divider">Star Players</div>
            <StarPlayerTable stars={home.starPlayers} />
          </>
        )}
      </div>
      <div className="flex flex-1 flex-col">
        <TeamTable compact players={away.players} cols={cols} />
        {away.journeymen.length > 0 && (
          <>
            <div className="divider">Journeymen</div>
            <TeamTable
              compact
              players={away.journeymen}
              cols={journeymanCols}
            />
          </>
        )}
        {away.starPlayers.length > 0 && (
          <>
            <div className="divider">Star Players</div>
            <StarPlayerTable stars={away.starPlayers} />
          </>
        )}
      </div>
    </div>
  );
}

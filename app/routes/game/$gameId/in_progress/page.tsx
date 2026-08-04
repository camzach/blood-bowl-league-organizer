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
import type { Route } from "./+types/page";

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

export async function loader({ params }: Route.LoaderArgs) {
  const { gameId } = params;

  const game = await db.query.game.findFirst({
    where: { id: decodeURIComponent(gameId) },
    with: {
      homeDetails: gameDetailsWithFullTeam,
      awayDetails: gameDetailsWithFullTeam,
    },
  });
  const proSkill = await db.query.skill.findFirst({
    where: { name: "Pro" },
  });
  if (!game) throw new Response("Not Found", { status: 404 });
  if (!game.homeDetails || !game.awayDetails) throw new Response("Not Found", { status: 404 });

  if (game.state !== "in_progress") {
    if (game.state === "complete") {
      throw redirect(`/game/${gameId}`);
    } else {
      throw redirect(
        `/game/${gameId}/${game.state.toLowerCase() as typeof game.state}`,
      );
    }
  }

  const starsToQuery = [game.homeDetails, game.awayDetails].flatMap((details) =>
    details.gameDetailsToStarPlayer.map((star) => star.starPlayerName),
  );

  // query star players separately because the query got too big and broke
  const stars =
    starsToQuery.length > 0
      ? await db.query.starPlayer.findMany({
          with: {
            skills: true,
            keywords: true,
          },
          where: { name: { in: starsToQuery } },
        })
      : [];

  return {
    gameId,
    proSkill,
    home: {
      name: game.homeDetails.team.name,
      id: game.homeDetails.team.id,
      song: game.homeDetails.team.song?.data,
      rerolls:
        game.homeDetails.team.rerolls +
        (game.homeDetails.gameDetailsToInducement.find(
          (ind) => ind.inducementName === "Extra Team Training",
        )?.count ?? 0),
      fanFactor: game.homeDetails.fanFactor,
      assistantCoaches:
        game.homeDetails.team.assistantCoaches +
        (game.homeDetails.gameDetailsToInducement.find(
          (ind) => ind.inducementName === "Part-time Assistant Coach",
        )?.count ?? 0),
      cheerleaders:
        game.homeDetails.team.cheerleaders +
        (game.homeDetails.gameDetailsToInducement.find(
          (ind) => ind.inducementName === "Temp Agency Cheerleader",
        )?.count ?? 0),
      players: game.homeDetails.team.players
        .filter((p) => p.membershipType === "player")
        .sort((a, b) => a.number - b.number)
        .map((player) => ({
          ...player,
          ...getPlayerStats(player),
          ...getPlayerSppAndTv(player),
          skills: getPlayerSkills(player, proSkill),
          keywords: player.position.keywords,
        })),
      journeymen: game.homeDetails.team.players
        .filter((p) => p.membershipType === "journeyman")
        .sort((a, b) => a.number - b.number)
        .map((player) => ({
          ...player,
          ...getPlayerStats(player),
          ...getPlayerSppAndTv(player),
          skills: getPlayerSkills(player, proSkill),
          keywords: player.position.keywords,
        })),
      starPlayers: game.homeDetails.gameDetailsToStarPlayer.map(
        ({ starPlayerName }) =>
          stars.find((star) => star.name === starPlayerName)!,
      ),
    },
    away: {
      name: game.awayDetails.team.name,
      id: game.awayDetails.team.id,
      song: game.awayDetails.team.song?.data,
      rerolls:
        game.awayDetails.team.rerolls +
        (game.awayDetails.gameDetailsToInducement.find(
          (ind) => ind.inducementName === "Extra Team Training",
        )?.count ?? 0),
      fanFactor: game.awayDetails.fanFactor,
      assistantCoaches:
        game.awayDetails.team.assistantCoaches +
        (game.awayDetails.gameDetailsToInducement.find(
          (ind) => ind.inducementName === "Part-time Assistant Coach",
        )?.count ?? 0),
      cheerleaders:
        game.awayDetails.team.cheerleaders +
        (game.awayDetails.gameDetailsToInducement.find(
          (ind) => ind.inducementName === "Temp Agency Cheerleader",
        )?.count ?? 0),
      players: game.awayDetails.team.players
        .filter((p) => p.membershipType === "player")
        .sort((a, b) => a.number - b.number)
        .map((player) => ({
          ...player,
          ...getPlayerStats(player),
          ...getPlayerSppAndTv(player),
          skills: getPlayerSkills(player, proSkill),
          keywords: player.position.keywords,
        })),
      journeymen: game.awayDetails.team.players
        .filter((p) => p.membershipType === "journeyman")
        .sort((a, b) => a.number - b.number)
        .map((player) => ({
          ...player,
          ...getPlayerStats(player),
          ...getPlayerSppAndTv(player),
          skills: getPlayerSkills(player, proSkill),
          keywords: player.position.keywords,
        })),
      starPlayers: game.awayDetails.gameDetailsToStarPlayer.map(
        ({ starPlayerName }) =>
          stars.find((star) => star.name === starPlayerName)!,
      ),
    },
    stars,
  };
}

export default function InProgress({ loaderData }: Route.ComponentProps) {
  const { gameId, home, away, stars, proSkill } = loaderData;

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
          players: home.players.map(p => ({
            id: p.id,
            name: p.name,
            number: p.number,
            missNextGame: p.missNextGame,
            keywords: p.keywords,
            nigglingInjuries: p.nigglingInjuries,
          })),
          journeymen: home.journeymen.map(p => ({
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
          players: away.players.map(p => ({
            id: p.id,
            name: p.name,
            number: p.number,
            missNextGame: p.missNextGame,
            keywords: p.keywords,
            nigglingInjuries: p.nigglingInjuries,
          })),
          journeymen: away.journeymen.map(p => ({
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
        <TeamTable
          compact
          players={home.players}
          cols={cols}
        />
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
        <TeamTable
          compact
          players={away.players}
          cols={cols}
        />
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

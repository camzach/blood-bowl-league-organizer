import { TeamTable } from "components/team-table";
import type { ComponentProps } from "react";
import ScoreWidget from "./score-widget";
import { notFound } from "next/navigation";
import StarPlayerTable from "./star-player-table";
import {
  getPlayerStats,
  getPlayerSkills,
  getPlayerSppAndTv,
} from "utils/get-computed-player-fields";
import { db } from "utils/drizzle";
import { and, eq, inArray } from "drizzle-orm";
import { game as dbGame, player, starPlayer } from "db/schema";

type Props = {
  params: { gameId: string };
};

const detailsSelect = {
  with: {
    gameDetailsToStarPlayer: true,
    team: {
      columns: {
        name: true,
        id: true,
        touchdownSong: true,
      },
      with: {
        song: true,
        players: {
          where: and(
            inArray(player.membershipType, ["player", "journeyman"]),
            eq(player.missNextGame, false),
          ),
          with: {
            position: {
              with: {
                rosterSlot: {
                  with: { roster: { with: { specialRuleToRoster: true } } },
                },
                skillToPosition: { with: { skill: true } },
              },
            },
            improvements: { with: { skill: true } },
          },
        },
      },
    },
  },
} satisfies Parameters<typeof db.query.gameDetails.findMany>[0];

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
  "ni",
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

export default async function InProgress({ params: { gameId } }: Props) {
  const game = await db.query.game.findFirst({
    where: eq(dbGame.id, decodeURIComponent(gameId)),
    with: {
      homeDetails: detailsSelect,
      awayDetails: detailsSelect,
    },
  });
  if (!game) return notFound();

  const starsToQuery = [game.homeDetails, game.awayDetails].flatMap((details) =>
    details.gameDetailsToStarPlayer.map((star) => star.starPlayerName),
  );

  // query star players separately because the query got too big and broke
  const stars =
    starsToQuery.length > 0
      ? (
          await db.query.starPlayer.findMany({
            where: inArray(starPlayer.name, starsToQuery),
            with: { skillToStarPlayer: { with: { skill: true } } },
          })
        ).map((star) => ({
          ...star,
          skills: star.skillToStarPlayer.map((skill) => skill.skill),
        }))
      : [];

  return (
    <div
      className="mx-auto grid w-4/5 grid-cols-[minmax(0,3fr)_minmax(0,1fr)_minmax(0,3fr)] gap-3"
      style={{ placeItems: "start center" }}
    >
      <div className="flex w-full flex-col">
        <TeamTable
          compact
          players={game.homeDetails.team.players
            .filter((p) => p.membershipType === "player")
            .map((player) => ({
              ...player,
              ...getPlayerStats(player),
              ...getPlayerSppAndTv(player),
              skills: getPlayerSkills(player),
            }))}
          cols={cols}
        />
        {game.homeDetails.team.players.filter(
          (p) => p.membershipType === "journeyman",
        ).length > 0 && (
          <>
            <div className="divider">Journeymen</div>
            <TeamTable
              compact
              players={game.homeDetails.team.players
                .filter((p) => p.membershipType === "journeyman")
                .map((player) => ({
                  ...player,
                  ...getPlayerStats(player),
                  ...getPlayerSppAndTv(player),
                  skills: getPlayerSkills(player),
                }))}
              cols={journeymanCols}
            />
          </>
        )}
        {game.homeDetails.gameDetailsToStarPlayer.length > 0 && (
          <>
            <div className="divider">Star Players</div>
            <StarPlayerTable
              stars={game.homeDetails.gameDetailsToStarPlayer.map(
                (e) => stars.find((star) => star.name === e.starPlayerName)!,
              )}
            />
          </>
        )}
      </div>
      <ScoreWidget
        gameId={gameId}
        home={{
          name: game.homeDetails.team.name,
          id: game.homeDetails.team.id,
          song: game.homeDetails.team.song?.data,
          players: game.homeDetails.team.players
            .filter((p) => p.membershipType === "player")
            .sort((a, b) => a.number - b.number),
          journeymen: game.homeDetails.team.players
            .filter((p) => p.membershipType === "journeyman")
            .sort((a, b) => a.number - b.number),
        }}
        away={{
          name: game.homeDetails.team.name,
          id: game.homeDetails.team.id,
          song: game.homeDetails.team.song?.data,
          players: game.awayDetails.team.players
            .filter((p) => p.membershipType === "player")
            .sort((a, b) => a.number - b.number),
          journeymen: game.awayDetails.team.players
            .filter((p) => p.membershipType === "journeyman")
            .sort((a, b) => a.number - b.number),
        }}
      />
      <div className="flex w-full flex-col">
        <TeamTable
          compact
          players={game.awayDetails.team.players
            .filter((p) => p.membershipType === "player")
            .map((player) => ({
              ...player,
              ...getPlayerStats(player),
              ...getPlayerSppAndTv(player),
              skills: getPlayerSkills(player),
            }))}
          cols={cols}
        />
        {game.awayDetails.team.players.filter(
          (p) => p.membershipType === "journeyman",
        ).length > 0 && (
          <>
            <div className="divider">Journeymen</div>
            <TeamTable
              compact
              players={game.awayDetails.team.players
                .filter((p) => p.membershipType === "journeyman")
                .map((player) => ({
                  ...player,
                  ...getPlayerStats(player),
                  ...getPlayerSppAndTv(player),
                  skills: getPlayerSkills(player),
                }))}
              cols={journeymanCols}
            />
          </>
        )}
        {game.awayDetails.gameDetailsToStarPlayer.length > 0 && (
          <>
            <div className="divider">Star Players</div>
            <StarPlayerTable
              stars={game.awayDetails.gameDetailsToStarPlayer.map(
                (e) => stars.find((star) => star.name === e.starPlayerName)!,
              )}
            />
          </>
        )}
      </div>
    </div>
  );
}

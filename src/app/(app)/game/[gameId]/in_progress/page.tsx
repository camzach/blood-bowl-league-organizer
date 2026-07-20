import { TeamTable } from "~/components/team-table";
import type { ComponentProps } from "react";
import ScoreWidget from "./score-widget";
import { notFound, redirect } from "next/navigation";
import StarPlayerTable from "./star-player-table";
import {
  getPlayerStats,
  getPlayerSkills,
  getPlayerSppAndTv,
} from "~/utils/get-computed-player-fields";
import { db } from "~/utils/drizzle";
import { gameDetailsWithFullTeam } from "~/db/query-fragments/game.fragments";

type Props = {
  params: Promise<{ gameId: string }>;
};

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

export default async function InProgress(props: Props) {
  const params = await props.params;

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
  if (!game) return notFound();
  if (!game.homeDetails || !game.awayDetails) return notFound();

  if (game.state !== "in_progress") {
    if (game.state === "complete") {
      redirect(`/game/${gameId}`);
    } else {
      redirect(
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

  return (
    <div
      className="mx-auto grid w-4/5 auto-cols-fr grid-cols-2 gap-3 gap-x-12"
      style={{ placeItems: "start center" }}
    >
      <ScoreWidget
        gameId={gameId}
        home={{
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
            .map((p) => ({
              ...p,
              keywords: p.position.keywords,
            })),
          journeymen: game.homeDetails.team.players
            .filter((p) => p.membershipType === "journeyman")
            .sort((a, b) => a.number - b.number)
            .map((p) => ({
              ...p,
              keywords: p.position.keywords,
            })),
          starPlayers: game.homeDetails.gameDetailsToStarPlayer.map(
            ({ starPlayerName }) =>
              stars.find((star) => star.name === starPlayerName)!,
          ),
        }}
        away={{
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
            .map((p) => ({
              ...p,
              keywords: p.position.keywords,
            })),
          journeymen: game.awayDetails.team.players
            .filter((p) => p.membershipType === "journeyman")
            .sort((a, b) => a.number - b.number)
            .map((p) => ({
              ...p,
              keywords: p.position.keywords,
            })),
          starPlayers: game.awayDetails.gameDetailsToStarPlayer.map(
            ({ starPlayerName }) =>
              stars.find((star) => star.name === starPlayerName)!,
          ),
        }}
      />

      <div className="flex flex-1 flex-col">
        <TeamTable
          compact
          players={game.homeDetails.team.players
            .filter((p) => p.membershipType === "player")
            .map((player) => ({
              ...player,
              ...getPlayerStats(player),
              ...getPlayerSppAndTv(player),
              skills: getPlayerSkills(player, proSkill),
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
                  skills: getPlayerSkills(player, proSkill),
                }))}
              cols={journeymanCols}
            />
          </>
        )}
        {game.homeDetails.gameDetailsToStarPlayer.length > 0 && (
          <>
            <div className="divider">Star Players</div>
            <StarPlayerTable
              stars={game.homeDetails.gameDetailsToStarPlayer.map((e) =>
                stars.find((star) => star.name === e.starPlayerName)!,
              )}
            />
          </>
        )}
      </div>
      <div className="flex flex-1 flex-col">
        <TeamTable
          compact
          players={game.awayDetails.team.players
            .filter((p) => p.membershipType === "player")
            .map((player) => ({
              ...player,
              ...getPlayerStats(player),
              ...getPlayerSppAndTv(player),
              skills: getPlayerSkills(player, proSkill),
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
                  skills: getPlayerSkills(player, proSkill),
                }))}
              cols={journeymanCols}
            />
          </>
        )}
        {game.awayDetails.gameDetailsToStarPlayer.length > 0 && (
          <>
            <div className="divider">Star Players</div>
            <StarPlayerTable
              stars={game.awayDetails.gameDetailsToStarPlayer.map((e) =>
                stars.find((star) => star.name === e.starPlayerName)!,
              )}
            />
          </>
        )}
      </div>
    </div>
  );
}

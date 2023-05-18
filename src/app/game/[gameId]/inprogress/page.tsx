import { Prisma } from "@prisma/client/edge";
import { TeamTable } from "components/team-table";
import type { ComponentProps, ReactElement } from "react";
import { prisma } from "utils/prisma";
import TeamArgs = Prisma.TeamArgs;
import PlayerFindManyArgs = Prisma.PlayerFindManyArgs;
import StarPlayerArgs = Prisma.StarPlayerArgs;
import ScoreWidget from "./score-widget";
import { notFound } from "next/navigation";
import StarPlayerTable from "./star-player-table";

type Props = {
  params: { gameId: string };
};

const playerSelect = {
  where: { missNextGame: false },
  include: { skills: { include: { faq: true } }, position: true },
} satisfies PlayerFindManyArgs;

const teamSelect = {
  select: {
    name: true,
    players: playerSelect,
    journeymen: playerSelect,
    touchdownSong: true,
  },
} satisfies TeamArgs;
const starPlayerSelect = { include: { skills: true } } satisfies StarPlayerArgs;
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

export default async function InProgress({
  params: { gameId },
}: Props): Promise<ReactElement> {
  const game = await prisma.game.findUnique({
    where: { id: decodeURIComponent(gameId) },
    select: {
      home: teamSelect,
      away: teamSelect,
      starPlayersHome: starPlayerSelect,
      starPlayersAway: starPlayerSelect,
    },
  });
  if (!game) return notFound();

  return (
    <div
      className="mx-auto grid w-4/5 grid-cols-[minmax(0,3fr)_minmax(0,1fr)_minmax(0,3fr)] gap-3"
      style={{ placeItems: "start center" }}
    >
      <div className="flex w-full flex-col">
        <TeamTable compact players={game.home.players} cols={cols} />
        {game.home.journeymen.length > 0 && (
          <>
            <div className="divider">Journeymen</div>
            <TeamTable
              compact
              players={game.home.journeymen}
              cols={journeymanCols}
            />
          </>
        )}
        {game.starPlayersHome.length > 0 && (
          <>
            <div className="divider">Star Players</div>
            {/* @ts-expect-error async component */}
            <StarPlayerTable stars={game.starPlayersHome} />
          </>
        )}
      </div>
      <ScoreWidget
        gameId={gameId}
        home={{
          name: game.home.name,
          song: game.home.touchdownSong?.data,
          players: game.home.players.sort((a, b) => a.number - b.number),
          journeymen: game.home.journeymen.sort((a, b) => a.number - b.number),
        }}
        away={{
          name: game.away.name,
          song: game.away.touchdownSong?.data,
          players: game.away.players.sort((a, b) => a.number - b.number),
          journeymen: game.away.journeymen.sort((a, b) => a.number - b.number),
        }}
      />
      <div className="flex w-full flex-col">
        <TeamTable compact players={game.away.players} cols={cols} />
        {game.away.journeymen.length > 0 && (
          <>
            <div className="divider">Journeymen</div>
            <TeamTable
              compact
              players={game.away.journeymen}
              cols={journeymanCols}
            />
          </>
        )}
        {game.starPlayersAway.length > 0 && (
          <>
            <div className="divider">Star Players</div>
            {/* @ts-expect-error async component */}
            <StarPlayerTable stars={game.starPlayersAway} />
          </>
        )}
      </div>
    </div>
  );
}

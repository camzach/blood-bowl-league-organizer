import { notFound, redirect } from "next/navigation";
import Content from "./content";
import { db } from "utils/drizzle";
import { game as dbGame, player, rosterSlot } from "db/schema";
import { and, eq, gte } from "drizzle-orm";
import { selectJourneymen } from "../actions";

const detailsFeilds = {
  with: {
    team: {
      with: {
        roster: {
          with: {
            rosterSlots: {
              where: gte(rosterSlot.max, 12),
              with: {
                position: true,
              },
            },
          },
        },
        players: {
          where: and(
            eq(player.missNextGame, false),
            eq(player.membershipType, "player")
          ),
        },
      },
    },
  },
} satisfies Parameters<typeof db.query.gameDetails.findMany>[0];

type Props = {
  params: { gameId: string };
};

export default async function Journeymen({ params: { gameId } }: Props) {
  const game = await db.query.game.findFirst({
    where: eq(dbGame.id, gameId),
    with: {
      homeDetails: detailsFeilds,
      awayDetails: detailsFeilds,
    },
  });
  if (!game) return notFound();

  if (game.state !== "journeymen")
    redirect(`/game/${gameId}/${game.state.toLowerCase()}`);

  return (
    <Content
      gameId={gameId}
      home={{
        name: game.homeDetails.team.name,
        choices: game.homeDetails.team.roster.rosterSlots.flatMap(
          (slot) => slot.position
        ),
        needed: Math.max(0, 11 - game.homeDetails.team.players.length),
      }}
      away={{
        name: game.awayDetails.team.name,
        choices: game.awayDetails.team.roster.rosterSlots.flatMap(
          (slot) => slot.position
        ),
        needed: Math.max(0, 11 - game.awayDetails.team.players.length),
      }}
      selectJourneymen={selectJourneymen}
    />
  );
}

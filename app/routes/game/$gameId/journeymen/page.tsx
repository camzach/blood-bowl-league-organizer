import { redirect } from "react-router";
import Content from "./content";
import { db } from "~/app/utils/drizzle";
import type { Route } from "./+types/page";

const detailsFields = {
  with: {
    team: {
      with: {
        roster: {
          with: {
            rosterSlots: {
              where: { max: { gte: 12 } },
              with: {
                position: true,
              },
            },
          },
        },
        players: {
          where: { missNextGame: false, membershipType: "player" },
        },
      },
    },
  },
} satisfies Parameters<typeof db.query.gameDetails.findMany>[0];

export async function loader({ params }: Route.LoaderArgs) {
  const { gameId } = params;

  const game = await db.query.game.findFirst({
    where: { id: gameId },
    with: {
      homeDetails: detailsFields,
      awayDetails: detailsFields,
    },
  });
  if (!game) throw new Response("Not Found", { status: 404 });
  if (!game.homeDetails || !game.awayDetails) throw new Response("Not Found", { status: 404 });

  if (game.state !== "journeymen") {
    if (game.state === "complete") {
      throw redirect(`/game/${gameId}`);
    } else {
      throw redirect(
        `/game/${gameId}/${game.state.toLowerCase() as typeof game.state}`,
      );
    }
  }

  return {
    gameId,
    home: {
      name: game.homeDetails.team.name,
      choices: game.homeDetails.team.roster.rosterSlots.flatMap(
        (slot) => slot.position,
      ),
      needed: Math.max(0, 11 - game.homeDetails.team.players.length),
    },
    away: {
      name: game.awayDetails.team.name,
      choices: game.awayDetails.team.roster.rosterSlots.flatMap(
        (slot) => slot.position,
      ),
      needed: Math.max(0, 11 - game.awayDetails.team.players.length),
    },
  };
}

export default function Journeymen({ loaderData }: Route.ComponentProps) {
  return (
    <Content
      gameId={loaderData.gameId}
      home={loaderData.home}
      away={loaderData.away}
    />
  );
}

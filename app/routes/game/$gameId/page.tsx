import { redirect } from "react-router";
import { db } from "~/app/utils/drizzle";
import type { Route } from "./+types/page";

export async function loader({ params }: Route.LoaderArgs) {
  const { gameId } = params;

  const game = await db.query.game.findFirst({
    where: { id: decodeURIComponent(gameId) },
    with: {
      homeDetails: {
        with: {
          mvp: true,
          team: {
            columns: {
              name: true,
            },
          },
        },
      },
      awayDetails: {
        with: {
          mvp: true,
          team: {
            columns: {
              name: true,
            },
          },
        },
      },
    },
  });
  if (!game) throw new Response("Not Found", { status: 404 });
  if (!game.homeDetails || !game.awayDetails) throw new Response("Not Found", { status: 404 });

  if (game.state !== "complete") {
    throw redirect(
      `/game/${gameId}/${game.state.toLowerCase() as typeof game.state}`,
    );
  }

  return {
    game: {
      homeDetails: {
        touchdowns: game.homeDetails.touchdowns,
        casualties: game.homeDetails.casualties,
        mvp: game.homeDetails.mvp,
        team: game.homeDetails.team,
      },
      awayDetails: {
        touchdowns: game.awayDetails.touchdowns,
        casualties: game.awayDetails.casualties,
        mvp: game.awayDetails.mvp,
        team: game.awayDetails.team,
      },
    },
  };
}

export default function Game({ loaderData }: Route.ComponentProps) {
  const { game } = loaderData;

  return (
    <div className="grid w-full place-items-center">
      <table className="bg-base-300 table w-1/4">
        <thead>
          <tr>
            <th className="border-0" />
            <th>{game.homeDetails.team.name}</th>
            <th>{game.awayDetails.team.name}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Score</td>
            <td>{game.homeDetails.touchdowns}</td>
            <td>{game.awayDetails.touchdowns}</td>
          </tr>
          <tr>
            <td>Casualties</td>
            <td>{game.homeDetails.casualties}</td>
            <td>{game.awayDetails.casualties}</td>
          </tr>
          <tr>
            <td>MVP</td>
            <td>
              {game.homeDetails.mvp?.name ??
                game.homeDetails.mvp?.number ??
                "None"}
            </td>
            <td>
              {game.awayDetails.mvp?.name ??
                game.awayDetails.mvp?.number ??
                "None"}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "utils/drizzle";
import { game as dbGame } from "db/schema";

export default async function Game(
  props: {
    params: Promise<{ gameId: string }>;
  }
) {
  const params = await props.params;

  const {
    gameId
  } = params;

  const game = await db.query.game.findFirst({
    where: eq(dbGame.id, decodeURIComponent(gameId)),
    with: {
      homeDetails: {
        with: { mvp: true, team: { columns: { name: true } } },
      },
      awayDetails: {
        with: { mvp: true, team: { columns: { name: true } } },
      },
    },
  });
  if (!game) return notFound();
  if (!game.homeDetails || !game.awayDetails) return notFound();

  if (game.state !== "complete")
    return redirect(`/game/${gameId}/${game.state.toLowerCase()}`);

  return (
    <div className="grid w-full place-items-center">
      <table className="table w-1/4 bg-base-300">
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

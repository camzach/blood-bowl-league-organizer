import { notFound, redirect } from "next/navigation";
import { prisma } from "utils/prisma";

export default async function Game({
  params: { gameId },
}: {
  params: { gameId: string };
}) {
  const game = await prisma.game.findUnique({
    where: { id: decodeURIComponent(gameId) },
    include: { MVPs: true },
  });
  if (!game) return notFound();

  if (game.state !== "Complete")
    return redirect(`/game/${gameId}/${game.state.toLowerCase()}`);

  const [homeMVP, awayMVP] = [game.homeTeamName, game.awayTeamName].map(
    (team) =>
      game.MVPs.find((p) =>
        [p.playerTeamName, p.journeymanTeamName].includes(team)
      )
  );

  return (
    <div className="grid w-full place-items-center">
      <table className="bable-zebra table">
        <thead>
          <tr>
            <th className="border-0" />
            <th>{game.homeTeamName}</th>
            <th>{game.awayTeamName}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Score</td>
            <td>{game.touchdownsHome}</td>
            <td>{game.touchdownsAway}</td>
          </tr>
          <tr>
            <td>Casualties</td>
            <td>{game.casualtiesHome}</td>
            <td>{game.casualtiesAway}</td>
          </tr>
          <tr>
            <td>MVP</td>
            <td>{homeMVP?.name ?? homeMVP?.number ?? "None"}</td>
            <td>{awayMVP?.name ?? awayMVP?.number ?? "None"}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

import type { Route } from "./+types/page";
import { PlayButton } from "./scheduled/play-button";
import JourneymenContent from "./journeymen/content";
import InducementsContent from "./inducements/content";
import InProgressContent from "./in_progress/page";
import { loadGameData } from "./loader";

export async function loader({ params }: Route.LoaderArgs) {
  return loadGameData(params.gameId);
}

export default function Game({ loaderData }: Route.ComponentProps) {
  switch (loaderData.state) {
    case "scheduled":
      return <PlayButton gameId={loaderData.gameId} />;

    case "journeymen":
      return (
        <JourneymenContent
          gameId={loaderData.gameId}
          home={loaderData.home}
          away={loaderData.away}
        />
      );

    case "inducements":
      return (
        <InducementsContent
          inducements={loaderData.inducements}
          stars={loaderData.stars}
          pettyCash={loaderData.pettyCash}
          treasury={loaderData.treasury}
          gameId={loaderData.gameId}
          teams={loaderData.teams}
        />
      );

    case "in_progress":
      return <InProgressContent loaderData={loaderData} />;

    case "complete": {
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
  }
}
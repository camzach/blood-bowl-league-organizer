import { authContext } from "~/app/primary-layout";
import type { Route } from "./+types/page";
import { redirect, useFetcher } from "react-router";
import { db } from "~/app/utils/drizzle";
import ScheduleEditor from "./index";

export async function loader({ context }: Route.LoaderArgs) {
  const { session } = context.get(authContext);

  const league = await db.query.league.findFirst({
    where: { id: session.activeOrganizationId ?? "" },
  });

  if (!league) return redirect("/");

  const draftTeams = await db.query.team.findMany({
    where: {
      leagueId: league.id,
      state: "draft",
    },
    columns: {
      name: true,
    },
  });

  const games = await db.query.roundRobinGame.findMany({
    where: {
      season: {
        leagueId: league.id,
        isActive: true,
      },
    },
    with: {
      game: {
        with: {
          homeDetails: { with: { team: true } },
          awayDetails: { with: { team: true } },
        },
      },
    },
  });

  return { league, draftTeams, games };
}

export default function ScheduleManagerPage({
  loaderData,
}: Route.ComponentProps) {
  const { draftTeams, games } = loaderData;
  const scheduleFetcher = useFetcher();
  const clearFetcher = useFetcher();
  const seedBracketFetcher = useFetcher();
  const endSeasonFetcher = useFetcher();

  const isScheduling = scheduleFetcher.state !== "idle";
  const isClearing = clearFetcher.state !== "idle";
  const isSeeding = seedBracketFetcher.state !== "idle";
  const isEnding = endSeasonFetcher.state !== "idle";

  return (
    <div className="flex flex-col">
      <h1 className="mb-4 text-2xl font-bold">Season Management</h1>
      
      {draftTeams.length > 0 && (
        <div className="alert alert-warning mb-5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 shrink-0 stroke-current"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>
            The following teams are still in draft mode:{" "}
            {draftTeams.map((t) => t.name).join(", ")}
          </span>
        </div>
      )}
      
      <div className="join mb-5">
        <button
          className="btn btn-primary join-item"
          disabled={isScheduling}
          onClick={() => {
            scheduleFetcher.submit(
              { action: "schedule" },
              { action: "/admin/action", method: "post" },
            );
          }}
        >
          {isScheduling ? "Scheduling..." : "Begin Season"}
        </button>
        <button
          className="btn btn-warning join-item"
          disabled={isClearing}
          onClick={() => {
            clearFetcher.submit(
              { action: "clear" },
              { action: "/admin/action", method: "post" },
            );
          }}
        >
          {isClearing ? "Clearing..." : "Clear Season"}
        </button>
        <button
          className="btn btn-secondary join-item"
          disabled={isSeeding}
          onClick={() => {
            seedBracketFetcher.submit(
              { action: "seed-bracket" },
              { action: "/admin/action", method: "post" },
            );
          }}
        >
          {isSeeding ? "Seeding..." : "Seed Bracket"}
        </button>
        <button
          className="btn btn-accent join-item"
          disabled={isEnding}
          onClick={() => {
            endSeasonFetcher.submit(
              { action: "end-season" },
              { action: "/admin/action", method: "post" },
            );
          }}
        >
          {isEnding ? "Ending..." : "End Season"}
        </button>
      </div>
      
      <ScheduleEditor
        games={games.map((g) => ({
          id: g.game.id,
          round: g.round,
          time: g.game.scheduledTime,
          homeTeam: g.game.homeDetails?.team.name,
          awayTeam: g.game.awayDetails?.team.name,
        }))}
      />
    </div>
  );
}

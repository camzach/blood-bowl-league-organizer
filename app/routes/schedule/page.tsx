import { redirect } from "react-router";
import { db } from "~/app/utils/drizzle";
import { authContext } from "~/app/primary-layout";
import type { Route } from "./+types/page";
import List from "./list";
import Calendar from "./calendar";
import Controls from "./controls";
import { Link } from "react-router";
import fetchGames from "./fetch-games";

export async function loader({ context, request }: Route.LoaderArgs) {
  const { session } = context.get(authContext);

  if (!session) {
    throw redirect("/login");
  }

  const url = new URL(request.url);
  const teamId = url.searchParams.getAll("teamId");
  const state = url.searchParams.get("state") ?? "any";
  const month = url.searchParams.get("month");
  const year = url.searchParams.get("year");
  const mode = url.searchParams.get("mode") ?? "calendar";

  const { teams, games } = await fetchGames({
    teamId: teamId.length > 0 ? teamId : undefined,
    state,
    league: session.activeOrganizationId ?? "",
  });

  const parsedMonth = month !== null ? parseInt(month) : undefined;
  const parsedYear = year !== null ? parseInt(year) : undefined;

  const baseURL =
    process.env.NODE_ENV === "production"
      ? import.meta.env.BASE_URL
      : "http://localhost:" + (process.env.PORT ?? "5173");

  const exportLink = new URL(
    `/api/calendar/${session.activeOrganizationId}/calendar.ics`,
    baseURL,
  );
  if (teamId.length > 0) {
    for (const id of teamId) {
      exportLink.searchParams.append("teamId", id);
    }
  }

  return {
    teams,
    games,
    mode,
    state,
    teamId,
    parsedMonth,
    parsedYear,
    exportLink: exportLink.toString(),
  };
}

export default function Schedule({ loaderData }: Route.ComponentProps) {
  const {
    teams,
    games,
    mode,
    state,
    teamId,
    parsedMonth,
    parsedYear,
    exportLink,
  } = loaderData;

  return (
    <div className="mx-auto flex flex-col gap-4 p-3 lg:flex-row">
      <div className="lg:mt-16">
        <Controls teams={teams} mode={mode} state={state} selected={teamId} />
        <Link to={exportLink}>Export Calendar</Link>
      </div>
      <div className="basis-full">
        {mode === "list" ? (
          <List games={games} />
        ) : (
          <Calendar games={games} month={parsedMonth} year={parsedYear} />
        )}
      </div>
    </div>
  );
}

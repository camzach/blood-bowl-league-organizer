import { activeLeagueContext } from "~/app/primary-layout";
import type { Route } from "./+types/page";
import List from "./list";
import Calendar from "./calendar";
import Controls from "./controls";
import { Link, useSearchParams } from "react-router";
import { z } from "zod";
import fetchGames from "./fetch-games";

export async function loader({ context, request }: Route.LoaderArgs) {
  const leagueId = context.get(activeLeagueContext)?.id ?? "";

  const url = new URL(request.url);
  const teamId = url.searchParams.getAll("teamId");
  const state = url.searchParams.get("state") ?? "any";

  const { teams, games } = await fetchGames({
    teamId: teamId.length > 0 ? teamId : undefined,
    state,
    league: leagueId,
  });

  const requestUrl = new URL(request.url);
  const baseURL = requestUrl.origin;

  const exportLink = new URL(`/api/calendar/${leagueId}/calendar.ics`, baseURL);
  if (teamId.length > 0) {
    for (const id of teamId) {
      exportLink.searchParams.append("teamId", id);
    }
  }

  return {
    teams,
    games,
    exportLink: exportLink.toString(),
  };
}

const monthParam = z
  .string()
  .min(1)
  .transform(Number)
  .pipe(z.number().int().min(0).max(11));
const yearParam = z
  .string()
  .min(1)
  .transform(Number)
  .pipe(z.number().int().min(1).max(9999));

export default function Schedule({ loaderData }: Route.ComponentProps) {
  const { teams, games, exportLink } = loaderData;
  const [searchParams] = useSearchParams();

  const mode = searchParams.get("mode") ?? "calendar";

  const parsedMonth = monthParam.safeParse(searchParams.get("month")).data;
  const parsedYear = yearParam.safeParse(searchParams.get("year")).data;

  return (
    <div className="mx-auto flex flex-col gap-4 p-3 lg:flex-row">
      <div className="lg:mt-16">
        <Controls teams={teams} />
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

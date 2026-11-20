import { activeLeagueContext, authContext } from "~/app/primary-layout";
import type { Route } from "./+types/page";
import List from "./list";
import Calendar from "./calendar";
import Controls from "./controls";
import { Link, useSearchParams } from "react-router";
import { z } from "zod";
import fetchGames from "./fetch-games";
import { getOrCreateCalendarToken } from "~/app/utils/calendar-feed.server";

export async function loader({ context, request }: Route.LoaderArgs) {
  const leagueId = context.get(activeLeagueContext)?.id ?? "";
  const { user } = context.get(authContext);

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

  let exportLink: string | null = null;
  if (leagueId) {
    const token = await getOrCreateCalendarToken(user.id, leagueId);
    const feedUrl = new URL(`/api/calendar/${token}/calendar.ics`, baseURL);
    for (const id of teamId) {
      feedUrl.searchParams.append("teamId", id);
    }
    exportLink = feedUrl.toString();
  }

  return { teams, games, exportLink };
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
        {exportLink && (
          <Link to={exportLink} reloadDocument>
            Export Calendar
          </Link>
        )}
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

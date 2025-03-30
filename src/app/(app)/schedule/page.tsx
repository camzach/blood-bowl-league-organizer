import fetchGames from "./fetch-games";
import List from "./list";
import Calendar from "./calendar";
import Controls from "./controls";
import { auth } from "auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import CopyText from "./copy-text";
import Link from "next/link";

type Props = {
  searchParams: Promise<{
    teamId?: string | string[];
    state?: string;
    month?: string;
    year?: string;
    mode?: string;
  }>;
};

export default async function Schedule(props: Props) {
  const searchParams = await props.searchParams;

  const { teamId, state = "any", month, year, mode } = searchParams;

  const apiSession = await auth.api.getSession({ headers: await headers() });
  if (!apiSession) return redirect("/login");
  const { session } = apiSession;

  const { teams, games } = await fetchGames({
    teamId,
    state,
    league: session.activeOrganizationId ?? "",
  });

  const parsedMonth = month !== undefined ? parseInt(month) : NaN;
  const parsedYear = year !== undefined ? parseInt(year) : NaN;

  const baseURL =
    process.env.NODE_ENV === "production"
      ? process.env.PRODUCTION_BASE_URL
      : typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:" + process.env.PORT;
  const exportLink = new URL(
    `/api/calendar/${session.activeOrganizationId}/calendar.ics`,
    baseURL,
  );
  if (teamId) {
    for (const id of typeof teamId === "string" ? [teamId] : teamId) {
      exportLink.searchParams.append("teamId", id);
    }
  }

  return (
    <div className="mx-auto flex flex-col gap-4 p-3 lg:flex-row">
      <div className="lg:mt-16">
        <Controls teams={teams} mode={mode} state={state} selected={teamId} />
        <Link href={exportLink.toString()}>Export Calendar</Link>
      </div>
      <div className="basis-full">
        {mode === "list" ? (
          <List games={games} />
        ) : (
          <Calendar
            games={games}
            month={!isNaN(parsedMonth) ? parsedMonth : undefined}
            year={!isNaN(parsedYear) ? parsedYear : undefined}
          />
        )}
      </div>
    </div>
  );
}

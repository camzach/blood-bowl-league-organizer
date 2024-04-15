import { currentUser, RedirectToSignIn } from "@clerk/nextjs";
import fetchGames from "./fetch-games";
import List from "./list";
import Calendar from "./calendar";
import Controls from "./controls";

type Props = {
  searchParams: {
    teamId?: string | string[];
    state?: string;
    month?: string;
    year?: string;
    mode?: string;
  };
};

export default async function Schedule({
  searchParams: { teamId, state = "any", month, year, mode },
}: Props) {
  const user = await currentUser();
  if (!user) return <RedirectToSignIn />;

  const { teams, games } = await fetchGames({
    teamId,
    state,
    league: user.publicMetadata.league as string,
  });

  const parsedMonth = (month !== undefined && parseInt(month)) || NaN;
  const parsedYear = (year !== undefined && parseInt(year)) || NaN;

  return (
    <div className="mx-auto grid w-3/4 grid-cols-[1fr_4fr] gap-4 p-3">
      <div>
        <Controls teams={teams} mode={mode} state={state} selected={teamId} />
      </div>
      <div>
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

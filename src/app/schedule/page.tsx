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
    <div className="mx-auto flex flex-col gap-4 p-3 lg:flex-row">
      <div className="lg:mt-16">
        <Controls teams={teams} mode={mode} state={state} selected={teamId} />
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

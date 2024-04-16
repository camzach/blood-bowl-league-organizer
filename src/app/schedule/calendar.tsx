"use client";
import fetchGames from "./fetch-games";
import { Metadata } from "next";
import {
  startOfMonth,
  startOfWeek,
  addDays,
  isSameDay,
  isSameMonth,
  addMonths,
} from "date-fns";
import classNames from "classnames";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export const metadata: Metadata = { title: "Schedule" };

type Props = {
  year?: number;
  month?: number;
  games: Awaited<ReturnType<typeof fetchGames>>["games"];
};

export default function Calendar(props: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  let month = new Date();
  if (props.year !== undefined) {
    month.setFullYear(props.year);
  }
  if (props.month !== undefined) {
    month.setMonth(props.month);
  }
  month = startOfMonth(month);

  const firstDay = startOfWeek(month);

  const nextMonth = addMonths(month, 1);
  const nextMonthSearch = new URLSearchParams(searchParams);
  nextMonthSearch.set("month", nextMonth.getMonth().toString());
  nextMonthSearch.set("year", nextMonth.getFullYear().toString());

  const lastMonth = addMonths(month, -1);
  const lastMonthSearch = new URLSearchParams(searchParams);
  lastMonthSearch.set("month", lastMonth.getMonth().toString());
  lastMonthSearch.set("year", lastMonth.getFullYear().toString());

  return (
    <div className="w-full">
      <span className="mb-4 flex items-center justify-center gap-4 text-3xl">
        <button
          className="btn"
          onClick={() => router.replace(`?${lastMonthSearch.toString()}`)}
        >
          &lt;
        </button>
        <h1>
          {month.toLocaleDateString("default", {
            month: "long",
            year: "numeric",
          })}
        </h1>
        <button
          className="btn"
          onClick={() => router.replace(`?${nextMonthSearch.toString()}`)}
        >
          &gt;
        </button>
      </span>
      <div className="grid auto-rows-fr grid-cols-[repeat(7,1fr)] gap-3 overflow-scroll">
        {Array.from(Array(6 * 7), (_, i) => addDays(firstDay, i)).map(
          (date) => {
            const gameList = props.games.filter(
              (game) => game.time && isSameDay(game.time, date),
            );
            return (
              <div
                className={classNames(
                  "flex aspect-[1/2] min-w-20 flex-col overflow-clip rounded-xl border bg-base-200 shadow-xl lg:aspect-square",
                  isSameDay(new Date(), date)
                    ? "border-accent"
                    : "border-neutral",
                  !isSameMonth(date, month) && "opacity-50",
                )}
                key={date.toString()}
              >
                <span className="w-full bg-neutral pb-1 text-center text-neutral-content">
                  {date.toLocaleDateString("default", { day: "numeric" })}
                </span>
                <div className="flex flex-1 flex-col gap-1 overflow-y-scroll p-2">
                  {gameList.map((game) => (
                    <Game key={game.id} game={game} />
                  ))}
                </div>
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}

function Game({
  game,
}: {
  game: Awaited<ReturnType<typeof fetchGames>>["games"][number];
}) {
  return (
    <Link
      href={`/game/${game.id}`}
      className={classNames(
        " w-full rounded-lg text-center",
        game.state === "scheduled"
          ? "bg-accent text-accent-content"
          : "bg-success text-success-content",
      )}
    >
      {game.awayDetails.teamName} @ {game.homeDetails.teamName}
    </Link>
  );
}

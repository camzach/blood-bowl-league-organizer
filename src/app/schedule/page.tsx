import Link from "next/link";
import { Fragment } from "react";
import { db } from "utils/drizzle";
import type { Metadata } from "next";
import { and, eq, or } from "drizzle-orm";
import { game, gameDetails, roundRobinGame, season, team } from "db/schema";
import { currentUser, RedirectToSignIn } from "@clerk/nextjs";
import LocalTimestamp from "./local-timestamp";
import { alias } from "drizzle-orm/pg-core";
import TeamFilter from "./team-filter";

export const metadata: Metadata = { title: "Schedule" };

type Props = {
  searchParams: {
    teamId?: string | string[];
    state?: string;
  };
};

export default async function Schedule(props: Props) {
  const user = await currentUser();
  if (!user) return <RedirectToSignIn />;

  const homeDetails = alias(gameDetails, "home_details");
  const awayDetails = alias(gameDetails, "away_details");
  const homeTeam = alias(team, "home_team");
  const awayTeam = alias(team, "away_team");

  const teamIdFilter = Array.isArray(props.searchParams.teamId)
    ? or(
        ...props.searchParams.teamId.flatMap((id) => [
          eq(homeDetails.teamId, id),
          eq(awayDetails.teamId, id),
        ]),
      )
    : typeof props.searchParams.teamId === "string"
      ? or(
          eq(homeDetails.teamId, props.searchParams.teamId),
          eq(awayDetails.teamId, props.searchParams.teamId),
        )
      : undefined;
  const gameStateFilter = {
    completed: eq(game.state, "complete"),
    scheduled: eq(game.state, "scheduled"),
  }[props.searchParams.state ?? "any"];

  const teams = await db.query.team.findMany({
    where: eq(team.leagueName, user.publicMetadata.league as string),
    columns: { name: true, id: true },
    orderBy: team.name,
  });

  const games = await db
    .select({
      round: roundRobinGame.round,
      state: game.state,
      time: game.scheduledTime,
      homeDetails: {
        teamName: homeTeam.name,
        teamId: homeTeam.id,
        touchdowns: homeDetails.touchdowns,
        casualties: homeDetails.casualties,
      },
      awayDetails: {
        teamName: awayTeam.name,
        teamId: awayTeam.id,
        touchdowns: awayDetails.touchdowns,
        casualties: awayDetails.casualties,
      },
      id: game.id,
    })
    .from(season)
    .innerJoin(roundRobinGame, eq(season.id, roundRobinGame.seasonId))
    .innerJoin(game, eq(game.id, roundRobinGame.gameId))
    .innerJoin(homeDetails, eq(homeDetails.id, game.homeDetailsId))
    .innerJoin(homeTeam, eq(homeTeam.id, homeDetails.teamId))
    .innerJoin(awayDetails, eq(awayDetails.id, game.awayDetailsId))
    .innerJoin(awayTeam, eq(awayTeam.id, awayDetails.teamId))
    .where(
      and(
        teamIdFilter,
        gameStateFilter,
        eq(season.leagueName, user.publicMetadata.league as string),
        eq(season.isActive, true),
      ),
    );

  const rounds = games.reduce<(typeof games)[]>((prev, curr) => {
    if (!(curr.round - 1 in prev)) {
      prev[curr.round - 1] = [curr];
    } else {
      prev[curr.round - 1].push(curr);
    }
    return prev;
  }, []);

  return (
    <>
      <TeamFilter
        teams={teams}
        selected={props.searchParams.teamId}
        state={props.searchParams.state}
      />
      {games.length === 0 ? (
        "No games currently scheduled. Ask your league administrator when the next season begins!"
      ) : (
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Round</th>
              <th>Home</th>
              <th>Away</th>
              <th>Time</th>
              <th>TD</th>
              <th>Cas</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            {rounds.map((round, roundIdx) => (
              <Fragment key={roundIdx}>
                {round.map(
                  ({ id, homeDetails, awayDetails, time, state }, gameIdx) => (
                    <tr key={id}>
                      {gameIdx === 0 && (
                        <td rowSpan={round.length}>{roundIdx + 1}</td>
                      )}
                      <td>{homeDetails.teamName}</td>
                      <td>{awayDetails.teamName}</td>
                      <td>
                        {time ? (
                          <LocalTimestamp time={new Date(time)} />
                        ) : (
                          "Unscheduled"
                        )}
                      </td>
                      <td>
                        {homeDetails.touchdowns} - {awayDetails.touchdowns}
                      </td>
                      <td>
                        {homeDetails.casualties} - {awayDetails.casualties}
                      </td>
                      <td>
                        <Link className="link" href={`/game/${id}`}>
                          {state === "complete" ? "View Result" : "Play"}
                        </Link>
                      </td>
                    </tr>
                  ),
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

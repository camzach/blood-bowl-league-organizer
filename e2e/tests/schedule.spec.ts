import { test, expect } from "../fixtures/index";
import type { Page } from "@playwright/test";

function gameRow(page: Page, home: string, away: string) {
  return page
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name: home, exact: true }) })
    .filter({ has: page.getByRole("cell", { name: away, exact: true }) });
}

test("schedule: the list shows each game's time, score and link", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  const teamA = await seed.team(leagueId, userId, { state: "ready" });
  const teamB = await seed.team(leagueId, userId, { state: "ready" });
  const teamC = await seed.team(leagueId, userId, { state: "ready" });
  const season = await seed.season(leagueId, { isActive: true });
  const playedAt = new Date("2030-07-10T10:00:00Z");
  await seed.game(leagueId, teamA.teamId, teamB.teamId, {
    seasonId: season.seasonId,
    round: 1,
    state: "complete",
    scheduledTime: playedAt,
    homeTouchdowns: 2,
    awayTouchdowns: 1,
    homeCasualties: 3,
    awayCasualties: 4,
  });
  await seed.game(leagueId, teamA.teamId, teamC.teamId, {
    seasonId: season.seasonId,
    round: 2,
  });

  await nav.goToScheduleList();

  await test.step("a played game shows its time, score and a result link", async () => {
    const played = gameRow(page, teamA.name, teamB.name);
    await expect(played).toContainText(
      playedAt.toLocaleString("en-US", { timeZone: "UTC" }),
    );
    await expect(
      played.getByRole("cell", { name: "2 - 1", exact: true }),
    ).toBeVisible();
    await expect(
      played.getByRole("cell", { name: "3 - 4", exact: true }),
    ).toBeVisible();
    await expect(
      played.getByRole("link", { name: "View Result" }),
    ).toBeVisible();
  });

  await test.step("a game with no time shows as unscheduled with a play link", async () => {
    const upcoming = gameRow(page, teamA.name, teamC.name);
    await expect(upcoming).toContainText("Unscheduled");
    await expect(upcoming.getByRole("link", { name: "Play" })).toBeVisible();
  });
});

test("schedule: opens as a calendar on the current month", async ({ page }) => {
  await page.goto("/schedule");

  await expect(
    page.getByRole("heading", { name: /^[A-Z][a-z]+ \d{4}$/, level: 1 }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Filters" }).click();
  await expect(page.getByRole("radio", { name: "Calendar" })).toBeChecked();
});

test("schedule: the display can be switched between calendar and list", async ({
  page,
  seed,
  leagueId,
  userId,
}) => {
  const home = await seed.team(leagueId, userId, { state: "ready" });
  const away = await seed.team(leagueId, userId, { state: "ready" });
  const season = await seed.season(leagueId, { isActive: true });
  await seed.game(leagueId, home.teamId, away.teamId, {
    seasonId: season.seasonId,
  });
  await page.goto("/schedule");

  await page.getByRole("button", { name: "Filters" }).click();

  await test.step("choosing list shows the table", async () => {
    await page.getByRole("radio", { name: "List" }).click();
    await expect(page.getByRole("radio", { name: "List" })).toBeChecked();
    await expect(gameRow(page, home.name, away.name)).toBeVisible();
  });

  await test.step("the list is kept after a reload", async () => {
    await page.reload();
    await expect(gameRow(page, home.name, away.name)).toBeVisible();
  });

  await test.step("choosing calendar shows the month again", async () => {
    await page.getByRole("button", { name: "Filters" }).click();
    await page.getByRole("radio", { name: "Calendar" }).click();
    await expect(page.getByRole("radio", { name: "Calendar" })).toBeChecked();
    await expect(
      page.getByRole("heading", { name: /^[A-Z][a-z]+ \d{4}$/, level: 1 }),
    ).toBeVisible();
    await expect(gameRow(page, home.name, away.name)).toBeHidden();
  });
});

test("schedule: the calendar shows games in their month and moves between months", async ({
  page,
  seed,
  leagueId,
  userId,
}) => {
  const home = await seed.team(leagueId, userId, { state: "ready" });
  const away = await seed.team(leagueId, userId, { state: "ready" });
  const unscheduledAway = await seed.team(leagueId, userId, { state: "ready" });
  const season = await seed.season(leagueId, { isActive: true });
  await seed.game(leagueId, home.teamId, away.teamId, {
    seasonId: season.seasonId,
    round: 1,
    scheduledTime: new Date("2030-07-10T10:00:00Z"),
  });
  await seed.game(leagueId, away.teamId, home.teamId, {
    seasonId: season.seasonId,
    round: 2,
    scheduledTime: new Date("2030-08-20T10:00:00Z"),
  });
  await seed.game(leagueId, home.teamId, unscheduledAway.teamId, {
    seasonId: season.seasonId,
    round: 3,
  });

  const julyGame = page.getByRole("link", {
    name: `${away.name} @ ${home.name}`,
  });
  const augustGame = page.getByRole("link", {
    name: `${home.name} @ ${away.name}`,
  });
  const unscheduledGame = page.getByRole("link", {
    name: `${unscheduledAway.name} @ ${home.name}`,
  });

  await page.goto("/schedule?year=2030&month=6");

  await test.step("a month shows only its own games", async () => {
    await expect(
      page.getByRole("heading", { name: "July 2030", level: 1 }),
    ).toBeVisible();
    await expect(julyGame).toBeVisible();
    await expect(augustGame).toHaveCount(0);
  });

  await test.step("a game with no time is not on the calendar", async () => {
    await expect(unscheduledGame).toHaveCount(0);
  });

  await test.step("next month shows the later game", async () => {
    await page.getByRole("button", { name: ">", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "August 2030", level: 1 }),
    ).toBeVisible();
    await expect(augustGame).toBeVisible();
    await expect(julyGame).toHaveCount(0);
  });

  await test.step("previous month goes back", async () => {
    await page.getByRole("button", { name: "<", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "July 2030", level: 1 }),
    ).toBeVisible();
    await expect(julyGame).toBeVisible();
  });

  await test.step("a month with fewer days can be reached and left", async () => {
    await page.getByRole("button", { name: "<", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "June 2030", level: 1 }),
    ).toBeVisible();
    await expect(julyGame).toHaveCount(0);

    await page.getByRole("button", { name: ">", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "July 2030", level: 1 }),
    ).toBeVisible();
    await expect(julyGame).toBeVisible();
  });

  await test.step("a game opens its page", async () => {
    await julyGame.click();
    await expect(page.getByRole("button", { name: "Play!!!" })).toBeVisible();
  });
});

test("schedule: the state filter narrows the list to completed or scheduled games", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  const home = await seed.team(leagueId, userId, { state: "ready" });
  const playedAway = await seed.team(leagueId, userId, { state: "ready" });
  const upcomingAway = await seed.team(leagueId, userId, { state: "ready" });
  const season = await seed.season(leagueId, { isActive: true });
  await seed.game(leagueId, home.teamId, playedAway.teamId, {
    seasonId: season.seasonId,
    round: 1,
    state: "complete",
  });
  await seed.game(leagueId, home.teamId, upcomingAway.teamId, {
    seasonId: season.seasonId,
    round: 2,
  });

  const played = gameRow(page, home.name, playedAway.name);
  const upcoming = gameRow(page, home.name, upcomingAway.name);

  await nav.goToScheduleList();
  await page.getByRole("button", { name: "Filters" }).click();
  await expect(page.getByRole("radio", { name: "Any" })).toBeChecked();

  await test.step("both games are listed to start with", async () => {
    await expect(played).toBeVisible();
    await expect(upcoming).toBeVisible();
  });

  await test.step("completed hides the scheduled game", async () => {
    await page.getByRole("radio", { name: "Completed" }).click();
    await expect(page.getByRole("radio", { name: "Completed" })).toBeChecked();
    await expect(played).toBeVisible();
    await expect(upcoming).toHaveCount(0);
  });

  await test.step("scheduled hides the completed game", async () => {
    await page.getByRole("radio", { name: "Scheduled" }).click();
    await expect(page.getByRole("radio", { name: "Scheduled" })).toBeChecked();
    await expect(upcoming).toBeVisible();
    await expect(played).toHaveCount(0);
  });

  await test.step("any lists both again", async () => {
    await page.getByRole("radio", { name: "Any" }).click();
    await expect(played).toBeVisible();
    await expect(upcoming).toBeVisible();
  });
});

test("schedule: the list says so when there are no games", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  await nav.goToScheduleList();

  await expect(
    page.getByText("No games currently scheduled. Ask your league"),
  ).toBeVisible();

  await test.step("a filter that matches nothing shows the same message", async () => {
    const home = await seed.team(leagueId, userId, { state: "ready" });
    const away = await seed.team(leagueId, userId, { state: "ready" });
    const season = await seed.season(leagueId, { isActive: true });
    await seed.game(leagueId, home.teamId, away.teamId, {
      seasonId: season.seasonId,
    });

    await page.reload();
    await page.getByRole("button", { name: "Filters" }).click();
    await page.getByRole("radio", { name: "Completed" }).click();
    await expect(
      page.getByText("No games currently scheduled. Ask your league"),
    ).toBeVisible();

    await page.getByRole("radio", { name: "Any" }).click();
    await expect(gameRow(page, home.name, away.name)).toBeVisible();
  });
});

test("schedule: games from a season that is not active are not listed", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  const home = await seed.team(leagueId, userId, { state: "ready" });
  const away = await seed.team(leagueId, userId, { state: "ready" });
  const oldSeason = await seed.season(leagueId, { isActive: false });
  await seed.game(leagueId, home.teamId, away.teamId, {
    seasonId: oldSeason.seasonId,
  });

  await nav.goToScheduleList();

  await expect(
    page.getByText("No games currently scheduled. Ask your league"),
  ).toBeVisible();
  await expect(gameRow(page, home.name, away.name)).toHaveCount(0);
});

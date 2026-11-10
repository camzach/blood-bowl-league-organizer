import { test, expect } from "../fixtures/index";
import type { Page } from "@playwright/test";

function gamesOf(page: Page, teamName: string) {
  return page.getByRole("row").filter({
    has: page.getByRole("cell", { name: teamName, exact: true }),
  });
}

test("schedule manager: beginning a season schedules every ready team against each other", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  const teams = [
    await seed.team(leagueId, userId, { state: "ready" }),
    await seed.team(leagueId, userId, { state: "ready" }),
    await seed.team(leagueId, userId, { state: "ready" }),
    await seed.team(leagueId, userId, { state: "ready" }),
  ];
  await seed.season(leagueId, { isActive: true });
  await page.reload();

  await test.step("no games are scheduled yet", async () => {
    await nav.goToScheduleManager();
    await expect(gamesOf(page, teams[0].name)).toHaveCount(0);
  });

  await test.step("beginning the season lists every pairing", async () => {
    await page.getByRole("button", { name: "Begin Season" }).click();
    for (const t of teams) {
      await expect(gamesOf(page, t.name)).toHaveCount(3);
    }
  });

  await test.step("beginning the season again is rejected", async () => {
    await page.getByRole("button", { name: "Begin Season" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Schedule already generated" }),
    ).toBeVisible();
  });

  await test.step("clearing the season removes the games", async () => {
    await page.getByRole("button", { name: "Clear Season" }).click();
    await expect(gamesOf(page, teams[0].name)).toHaveCount(0);
  });

  await test.step("a cleared season can be begun again", async () => {
    await page.getByRole("button", { name: "Begin Season" }).click();
    await expect(gamesOf(page, teams[0].name)).toHaveCount(3);
  });
});

test("schedule manager: warns about teams that are still in draft", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  const draft = await seed.team(leagueId, userId, { state: "draft" });
  await seed.team(leagueId, userId, { state: "ready" });

  await nav.goToScheduleManager();

  await expect(
    page.getByText(
      `The following teams are still in draft mode: ${draft.name}`,
    ),
  ).toBeVisible();
});

test("schedule manager: there is no warning when no team is in draft", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  await seed.team(leagueId, userId, { state: "ready" });

  await nav.goToScheduleManager();

  await expect(
    page.getByText("The following teams are still in draft mode"),
  ).toBeHidden();
});

for (const button of [
  "Begin Season",
  "Clear Season",
  "Seed Bracket",
  "End Season",
]) {
  test(`schedule manager: ${button} reports there is no active season`, async ({
    page,
    nav,
  }) => {
    await nav.goToScheduleManager();
    await page.getByRole("button", { name: button }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "No active season" }),
    ).toBeVisible();
  });
}

test("schedule manager: a season with started games cannot be cleared", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  const home = await seed.team(leagueId, userId, { state: "playing" });
  const away = await seed.team(leagueId, userId, { state: "playing" });
  const season = await seed.season(leagueId, { isActive: true });
  await seed.game(leagueId, home.teamId, away.teamId, {
    seasonId: season.seasonId,
    state: "in_progress",
  });

  await nav.goToScheduleManager();
  await page.getByRole("button", { name: "Clear Season" }).click();

  await expect(
    page.getByRole("alert").filter({
      hasText: "Cannot clear a season with games already started",
    }),
  ).toBeVisible();
  await expect(gamesOf(page, home.name)).toBeVisible();
});

test("schedule manager: a season cannot end while games are unplayed", async ({
  page,
  nav,
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

  await nav.goToScheduleManager();
  await page.getByRole("button", { name: "End Season" }).click();

  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Not all games have been played" }),
  ).toBeVisible();
});

test("schedule manager: a season cannot end while a team is not ready", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  await seed.team(leagueId, userId, { state: "ready" });
  await seed.team(leagueId, userId, { state: "hiring" });
  await seed.season(leagueId, { isActive: true });

  await nav.goToScheduleManager();
  await page.getByRole("button", { name: "End Season" }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "Not all teams are ready" }),
  ).toBeVisible();
});

test("schedule manager: ending a finished season closes it", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  const home = await seed.team(leagueId, userId, { state: "ready" });
  const away = await seed.team(leagueId, userId, { state: "ready" });
  const season = await seed.season(leagueId, { isActive: true });
  await seed.game(leagueId, home.teamId, away.teamId, {
    seasonId: season.seasonId,
    state: "complete",
  });

  await test.step("the finished season's games are listed", async () => {
    await nav.goToScheduleManager();
    await expect(gamesOf(page, home.name)).toBeVisible();
  });

  await test.step("ending the season clears the schedule manager", async () => {
    await page.getByRole("button", { name: "End Season" }).click();
    await expect(gamesOf(page, home.name)).toHaveCount(0);
  });

  await test.step("there is no season left to act on", async () => {
    await page.getByRole("button", { name: "End Season" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "No active season" }),
    ).toBeVisible();
  });

  await test.step("the teams are no longer editable", async () => {
    await page.goto(`/team/${home.teamId}`);
    await expect(
      page.getByRole("heading", { name: home.name, level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Edit" })).toBeHidden();
  });
});

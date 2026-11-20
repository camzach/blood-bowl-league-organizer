import { eq } from "drizzle-orm";
import { gameDetails } from "~/db/schema";
import { test, expect } from "../fixtures/index";
import { testDb } from "../fixtures/db";

test("playoffs: the bracket and its link appear once the bracket is seeded", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  const first = await seed.team(leagueId, userId, { state: "ready" });
  const second = await seed.team(leagueId, userId, { state: "ready" });
  const third = await seed.team(leagueId, userId, { state: "ready" });
  const fourth = await seed.team(leagueId, userId, { state: "ready" });
  const season = await seed.season(leagueId, { isActive: true });
  const results = [
    [first, second],
    [first, third],
    [first, fourth],
    [second, third],
    [second, fourth],
    [third, fourth],
  ];
  for (const [winner, loser] of results) {
    await seed.game(leagueId, winner.teamId, loser.teamId, {
      seasonId: season.seasonId,
      state: "complete",
      homeTouchdowns: 1,
    });
  }
  const playoffsLink = page
    .getByRole("navigation")
    .getByRole("link", { name: "Playoffs" });

  await test.step("there is no Playoffs link before the bracket is seeded", async () => {
    await nav.goToScheduleManager();
    await expect(playoffsLink).toBeHidden();
  });

  await test.step("seeding the bracket adds the Playoffs link", async () => {
    await page.getByRole("button", { name: "Seed Bracket" }).click();
    await expect(playoffsLink).toBeVisible();
  });

  await test.step("the top seed hosts the bottom seed and second hosts third", async () => {
    await playoffsLink.click();
    await expect(
      page.getByRole("link", { name: `${fourth.name} @ ${first.name}` }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: `${third.name} @ ${second.name}` }),
    ).toBeVisible();
  });

  await test.step("the final waits for the semi-finals", async () => {
    await expect(page.getByRole("link", { name: "TBD @ TBD" })).toBeVisible();
  });
});

test("playoffs: the top seed skips the semi-finals when there are three teams", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  const first = await seed.team(leagueId, userId, { state: "ready" });
  const second = await seed.team(leagueId, userId, { state: "ready" });
  const third = await seed.team(leagueId, userId, { state: "ready" });
  const season = await seed.season(leagueId, { isActive: true });
  const results = [
    [first, second],
    [first, third],
    [second, third],
  ];
  for (const [winner, loser] of results) {
    await seed.game(leagueId, winner.teamId, loser.teamId, {
      seasonId: season.seasonId,
      state: "complete",
      homeTouchdowns: 1,
    });
  }

  await nav.goToScheduleManager();
  await page.getByRole("button", { name: "Seed Bracket" }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Playoffs" })
    .click();

  await expect(
    page.getByRole("link", { name: `${third.name} @ ${second.name}` }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: `TBD @ ${first.name}` }),
  ).toBeVisible();
});

test("playoffs: seeding again rebuilds the bracket from the current table", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  const home = await seed.team(leagueId, userId, { state: "ready" });
  const away = await seed.team(leagueId, userId, { state: "ready" });
  const season = await seed.season(leagueId, { isActive: true });
  const regularGame = await seed.game(leagueId, home.teamId, away.teamId, {
    seasonId: season.seasonId,
    state: "complete",
    homeTouchdowns: 1,
  });
  const playoffsLink = page
    .getByRole("navigation")
    .getByRole("link", { name: "Playoffs" });

  await test.step("the leader of the table hosts the final", async () => {
    await nav.goToScheduleManager();
    await page.getByRole("button", { name: "Seed Bracket" }).click();
    await playoffsLink.click();
    await expect(
      page.getByRole("link", { name: `${away.name} @ ${home.name}` }),
    ).toBeVisible();
  });

  await test.step("after the table changes, seeding again moves the other team to the top", async () => {
    await testDb
      .update(gameDetails)
      .set({ touchdowns: 0 })
      .where(eq(gameDetails.id, regularGame.homeDetailsId));
    await testDb
      .update(gameDetails)
      .set({ touchdowns: 1 })
      .where(eq(gameDetails.id, regularGame.awayDetailsId));
    await nav.goToScheduleManager();
    const seeded = page.waitForResponse(
      (response) =>
        response.url().includes("/admin/action") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Seed Bracket" }).click();
    await seeded;
    await playoffsLink.click();
    await expect(
      page.getByRole("link", { name: `${home.name} @ ${away.name}` }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: `${away.name} @ ${home.name}` }),
    ).toBeHidden();
  });
});

test("playoffs: a bracket cannot be seeded again once a game has started", async ({
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
    homeTouchdowns: 1,
  });

  await nav.goToScheduleManager();
  await page.getByRole("button", { name: "Seed Bracket" }).click();
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Playoffs" }),
  ).toBeVisible();
  await seed.startScheduledGames(leagueId);

  await page.getByRole("button", { name: "Seed Bracket" }).click();

  await expect(
    page.getByRole("alert").filter({
      hasText: "Cannot reseed a bracket with games already started",
    }),
  ).toBeVisible();
});

test("playoffs: the winner of a semi-final moves on to the final", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  const first = await seed.team(leagueId, userId, { state: "ready" });
  const second = await seed.team(leagueId, userId, { state: "ready" });
  const third = await seed.team(leagueId, userId, { state: "ready" });
  const fourth = await seed.team(leagueId, userId, { state: "ready" });
  const season = await seed.season(leagueId, { isActive: true });
  const results = [
    [first, second],
    [first, third],
    [first, fourth],
    [second, third],
    [second, fourth],
    [third, fourth],
  ];
  for (const [winner, loser] of results) {
    await seed.game(leagueId, winner.teamId, loser.teamId, {
      seasonId: season.seasonId,
      state: "complete",
      homeTouchdowns: 1,
    });
  }
  const playoffsLink = page
    .getByRole("navigation")
    .getByRole("link", { name: "Playoffs" });
  const touchdownDialog = page.getByRole("dialog", {
    name: "Record Touchdown",
  });
  const mvpDialog = page.getByRole("dialog", { name: "MVP Nomination" });
  const resultsDialog = page.getByRole("dialog", {
    name: "Post-Game Sequence",
  });

  await test.step("seed the bracket and start the semi-finals", async () => {
    await nav.goToScheduleManager();
    await page.getByRole("button", { name: "Seed Bracket" }).click();
    await expect(playoffsLink).toBeVisible();
    await seed.startScheduledGames(leagueId);
  });

  await test.step("the top seed scores once and wins its semi-final", async () => {
    await playoffsLink.click();
    await page
      .getByRole("link", { name: `${fourth.name} @ ${first.name}` })
      .click();
    await page
      .getByRole("button", { name: `Record touchdown for ${first.name}` })
      .click();
    await touchdownDialog
      .getByRole("combobox", { name: "Scored By:" })
      .selectOption({ label: "3" });
    await touchdownDialog.getByRole("button", { name: "Done" }).click();
    await expect(page.getByText("Touchdowns 1")).toBeVisible();

    await page.getByRole("button", { name: "Done — end game" }).click();
    const firstGroup = mvpDialog.getByRole("group", { name: first.name });
    const fourthGroup = mvpDialog.getByRole("group", { name: fourth.name });
    for (const number of [1, 2, 3, 4, 5, 6]) {
      await firstGroup
        .getByRole("checkbox", { name: `#${number}`, exact: true })
        .check();
      await fourthGroup
        .getByRole("checkbox", { name: `#${number}`, exact: true })
        .check();
    }
    await mvpDialog.getByRole("button", { name: "Submit Nominations" }).click();
    await expect(resultsDialog).toBeVisible();
    await resultsDialog.getByRole("button", { name: "Close" }).click();
    await expect(resultsDialog).toBeHidden();
  });

  await test.step("the winner is waiting in the final and the other semi-final is untouched", async () => {
    await playoffsLink.click();
    await expect(
      page.getByRole("link", { name: `TBD @ ${first.name}` }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: `${third.name} @ ${second.name}` }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "TBD @ TBD" })).toBeHidden();
  });
});

test("playoffs: a tied final is rejected", async ({
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
    homeTouchdowns: 1,
  });
  const playoffsLink = page
    .getByRole("navigation")
    .getByRole("link", { name: "Playoffs" });
  const touchdownDialog = page.getByRole("dialog", {
    name: "Record Touchdown",
  });
  const mvpDialog = page.getByRole("dialog", { name: "MVP Nomination" });

  await test.step("seed a bracket that is only a final, and start it", async () => {
    await nav.goToScheduleManager();
    await page.getByRole("button", { name: "Seed Bracket" }).click();
    await expect(playoffsLink).toBeVisible();
    await seed.startScheduledGames(leagueId);
  });

  await test.step("each team scores once", async () => {
    await playoffsLink.click();
    await page
      .getByRole("link", { name: `${away.name} @ ${home.name}` })
      .click();
    for (const team of [home, away]) {
      await page
        .getByRole("button", { name: `Record touchdown for ${team.name}` })
        .click();
      await touchdownDialog
        .getByRole("combobox", { name: "Scored By:" })
        .selectOption({ label: "3" });
      await touchdownDialog.getByRole("button", { name: "Done" }).click();
      await expect(touchdownDialog).toBeHidden();
    }
  });

  await test.step("ending the level game fails", async () => {
    await page.getByRole("button", { name: "Done — end game" }).click();
    const homeGroup = mvpDialog.getByRole("group", { name: home.name });
    const awayGroup = mvpDialog.getByRole("group", { name: away.name });
    for (const number of [1, 2, 3, 4, 5, 6]) {
      await homeGroup
        .getByRole("checkbox", { name: `#${number}`, exact: true })
        .check();
      await awayGroup
        .getByRole("checkbox", { name: `#${number}`, exact: true })
        .check();
    }
    await mvpDialog.getByRole("button", { name: "Submit Nominations" }).click();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Ties are not allowed in the playoffs" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: /There was an error with your submission/,
      }),
    ).toBeVisible();
  });

  await test.step("the game is still in progress", async () => {
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Done — end game" }),
    ).toBeVisible();
  });
});

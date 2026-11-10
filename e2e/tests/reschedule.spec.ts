import { test, expect } from "../fixtures/index";

test("reschedule: admin can set a scheduled time on a game", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  const teamA = await seed.team(leagueId, userId, { state: "ready" });
  const teamB = await seed.team(leagueId, userId, { state: "ready" });
  const season = await seed.season(leagueId, { isActive: true });
  await seed.game(leagueId, teamA.teamId, teamB.teamId, {
    seasonId: season.seasonId,
  });
  await page.reload();

  // The browser runs in UTC (timezoneId: "UTC" in playwright.config.ts).
  // datetime-local treats the fill value as local (UTC) time, stores as UTC,
  // and displays via toLocaleString() in UTC. Compute the expected string the
  // same way so the assertion is portable regardless of the Node process TZ.
  const scheduledDate = new Date("1998-08-27T08:04:00Z");
  const expectedDisplay = scheduledDate.toLocaleString("en-US", {
    timeZone: "UTC",
  });

  await nav.goToScheduleManager();

  const gameRow = page
    .getByRole("row")
    .filter({ has: page.getByText(teamA.name) })
    .filter({ has: page.getByText(teamB.name) });

  const dateSelector = gameRow.getByRole("textbox", { name: "Scheduled time" });
  await dateSelector.fill(scheduledDate.toISOString().slice(0, 16));

  await page.getByRole("button", { name: "Submit schedule changes" }).click();
  await expect(page.getByRole("button", { name: "Success!" })).toBeVisible();

  await nav.goToSchedule();
  await page.getByRole("button", { name: "Filters" }).click();
  await page.getByRole("radio", { name: "List" }).click();
  await expect(page.getByRole("radio", { name: "List" })).toBeChecked();

  // Re-query the row against the schedule list — gameRow was scoped to the
  // schedule manager page and is stale after navigation.
  const scheduleRow = page
    .getByRole("row")
    .filter({ has: page.getByText(teamA.name) })
    .filter({ has: page.getByText(teamB.name) });

  await expect(scheduleRow).toContainText(expectedDisplay);
});

test("reschedule: a later round is blocked until its earlier games are scheduled before it", async ({
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
  await seed.game(leagueId, teamA.teamId, teamB.teamId, {
    seasonId: season.seasonId,
    round: 1,
  });
  await seed.game(leagueId, teamA.teamId, teamC.teamId, {
    seasonId: season.seasonId,
    round: 2,
  });
  await page.reload();

  const firstRound = page.getByRole("row").filter({
    has: page.getByRole("cell", { name: teamB.name, exact: true }),
  });
  const secondRound = page.getByRole("row").filter({
    has: page.getByRole("cell", { name: teamC.name, exact: true }),
  });
  const blocker = secondRound.getByRole("listitem");

  await test.step("a later round is blocked by an unscheduled earlier game", async () => {
    await nav.goToScheduleManager();
    await expect(blocker).toHaveText(`${teamB.name} @ ${teamA.name}`);
    await expect(firstRound.getByRole("listitem")).toHaveCount(0);
  });

  await test.step("scheduling the earlier game unblocks the later one", async () => {
    await firstRound
      .getByRole("textbox", { name: "Scheduled time" })
      .fill("2030-01-10T10:00");
    await expect(blocker).toHaveCount(0);
  });

  await test.step("scheduling the later game before the earlier one blocks it again", async () => {
    await secondRound
      .getByRole("textbox", { name: "Scheduled time" })
      .fill("2030-01-05T10:00");
    await expect(blocker).toHaveText(`${teamB.name} @ ${teamA.name}`);
  });

  await test.step("moving it after the earlier game unblocks it", async () => {
    await secondRound
      .getByRole("textbox", { name: "Scheduled time" })
      .fill("2030-01-12T10:00");
    await expect(blocker).toHaveCount(0);
  });

  await test.step("both times are saved and kept after a reload", async () => {
    await page.getByRole("button", { name: "Submit schedule changes" }).click();
    await expect(page.getByRole("button", { name: "Success!" })).toBeVisible();
    await page.reload();
    await expect(
      firstRound.getByRole("textbox", { name: "Scheduled time" }),
    ).toHaveValue("2030-01-10T10:00");
    await expect(
      secondRound.getByRole("textbox", { name: "Scheduled time" }),
    ).toHaveValue("2030-01-12T10:00");
  });
});

test("reschedule: a game without a time shows as unscheduled on the schedule", async ({
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
  await page.reload();

  await nav.goToSchedule();
  await page.getByRole("button", { name: "Filters" }).click();
  await page.getByRole("radio", { name: "List" }).click();

  await expect(
    page.getByRole("row").filter({
      has: page.getByRole("cell", { name: home.name, exact: true }),
    }),
  ).toContainText("Unscheduled");
});

test("reschedule: emptying the time field keeps the page working and the chosen time", async ({
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
  await page.reload();

  await nav.goToScheduleManager();
  const picker = page.getByRole("textbox", { name: "Scheduled time" });
  await picker.fill("2030-01-10T10:00");
  await picker.fill("");

  await expect(picker).toHaveValue("2030-01-10T10:00");
  await page.getByRole("button", { name: "Submit schedule changes" }).click();
  await expect(page.getByRole("button", { name: "Success!" })).toBeVisible();
});

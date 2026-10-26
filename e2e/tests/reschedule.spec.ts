import { test, expect } from "../fixtures/index";

test("reschedule: admin can set a scheduled time on a game", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  await seed.makeAdmin(userId);

  const teamA = await seed.team(leagueId, userId, { state: "ready" });
  const teamB = await seed.team(leagueId, userId, { state: "ready" });
  const season = await seed.season(leagueId, { isActive: true });
  await seed.game(teamA.teamId, teamB.teamId, {
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

import { readFile } from "node:fs/promises";
import { and, eq } from "drizzle-orm";
import { member } from "~/db/schema";
import { test, expect } from "../fixtures/index";
import { testDb } from "../fixtures/db";

test.describe("calendar feed", () => {
  test("a link that was never issued is not found", async ({ page }) => {
    const response = await page.request.get(
      "/api/calendar/not-a-real-token/calendar.ics",
    );

    expect(response.status()).toBe(404);
  });

  test("playoff games are in the feed", async ({
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
      bracket: { round: 1, seed: 1 },
      scheduledTime: new Date("2030-08-14T18:00:00Z"),
    });

    await nav.goToSchedule();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Export Calendar" }).click(),
    ]);
    const body = await readFile(await download.path(), "utf8");

    expect(body).toContain(`SUMMARY:${away.name} @ ${home.name}`);
  });

  test("a coach who leaves the league can no longer use their link", async ({
    page,
    nav,
    leagueId,
    userId,
  }) => {
    await nav.goToSchedule();
    const href = await page
      .getByRole("link", { name: "Export Calendar" })
      .getAttribute("href");

    await test.step("the link works while they are a member", async () => {
      const response = await page.request.get(href ?? "");

      expect(response.status()).toBe(200);
    });

    await test.step("the link is not found once they are removed", async () => {
      await testDb
        .delete(member)
        .where(and(eq(member.userId, userId), eq(member.leagueId, leagueId)));

      const response = await page.request.get(href ?? "");

      expect(response.status()).toBe(404);
    });
  });

  test.describe("as a plain member", () => {
    test.use({ role: "member" });

    test("a member's link works", async ({ page, nav }) => {
      await nav.goToSchedule();
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.getByRole("link", { name: "Export Calendar" }).click(),
      ]);
      const body = await readFile(await download.path(), "utf8");

      expect(download.suggestedFilename()).toBe("calendar.ics");
      expect(body).toContain("BEGIN:VCALENDAR");
    });
  });

  test("schedule: the exported calendar lists scheduled games and can be filtered by team", async ({
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
      scheduledTime: new Date("2030-07-10T10:00:00Z"),
    });
    await seed.game(leagueId, teamB.teamId, teamC.teamId, {
      seasonId: season.seasonId,
      round: 2,
      scheduledTime: new Date("2030-07-17T10:00:00Z"),
    });
    await seed.game(leagueId, teamA.teamId, teamC.teamId, {
      seasonId: season.seasonId,
      round: 3,
    });

    await nav.goToSchedule();
    const exportLink = page.getByRole("link", { name: "Export Calendar" });

    await test.step("clicking Export Calendar downloads every game with a time", async () => {
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        exportLink.click(),
      ]);
      const body = await readFile(await download.path(), "utf8");

      expect(download.suggestedFilename()).toBe("calendar.ics");
      expect(body).toContain(`SUMMARY:${teamB.name} @ ${teamA.name}`);
      expect(body).toContain(`SUMMARY:${teamC.name} @ ${teamB.name}`);
      expect(body).toContain("DTSTART:20300710T100000Z");
      expect(body).not.toContain(`SUMMARY:${teamC.name} @ ${teamA.name}`);
    });

    await test.step("choosing a team in the filters exports only that team's games", async () => {
      await page.getByRole("button", { name: "Filters" }).click();
      await page
        .getByRole("checkbox", { name: teamA.name, exact: true })
        .click();
      await expect(exportLink).toHaveAttribute(
        "href",
        new RegExp(`teamId=${teamA.teamId}`),
      );
      await page.keyboard.press("Escape");

      const [download] = await Promise.all([
        page.waitForEvent("download"),
        exportLink.click(),
      ]);
      const body = await readFile(await download.path(), "utf8");

      expect(body).toContain(`SUMMARY:${teamB.name} @ ${teamA.name}`);
      expect(body).not.toContain(`SUMMARY:${teamC.name} @ ${teamB.name}`);
    });
  });
});

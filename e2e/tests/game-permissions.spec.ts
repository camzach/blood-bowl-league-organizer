import { test, expect } from "../fixtures/index";

test.describe("as a plain member", () => {
  test.use({ role: "member" });

  test("a coach of neither team cannot start the game", async ({
    page,
    nav,
    seed,
    leagueId,
    adminUserId,
  }) => {
    const home = await seed.team(leagueId, adminUserId, { state: "ready" });
    const away = await seed.team(leagueId, adminUserId, { state: "ready" });
    const season = await seed.season(leagueId, { isActive: true });
    await seed.game(leagueId, home.teamId, away.teamId, {
      seasonId: season.seasonId,
    });

    await nav.goToGame(home.name, away.name);
    await page.getByRole("button", { name: "Play!!!" }).click();

    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "You do not have permission to act on this game" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Play!!!" })).toBeEnabled();
  });

  test("a coach of neither team cannot buy inducements", async ({
    page,
    nav,
    seed,
    leagueId,
    adminUserId,
  }) => {
    const home = await seed.team(leagueId, adminUserId, { state: "playing" });
    const away = await seed.team(leagueId, adminUserId, { state: "playing" });
    const season = await seed.season(leagueId, { isActive: true });
    await seed.game(leagueId, home.teamId, away.teamId, {
      seasonId: season.seasonId,
      state: "inducements",
    });

    await nav.goToGame(home.name, away.name);
    await page.getByRole("button", { name: "Done :)" }).click();

    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "You do not have permission to act on this game" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Done :)" })).toBeEnabled();
  });

  test("a coach of neither team cannot end the game", async ({
    page,
    nav,
    seed,
    leagueId,
    adminUserId,
  }) => {
    const home = await seed.team(leagueId, adminUserId, { state: "ready" });
    const away = await seed.team(leagueId, adminUserId, { state: "ready" });
    const season = await seed.season(leagueId, { isActive: true });
    await seed.game(leagueId, home.teamId, away.teamId, {
      seasonId: season.seasonId,
      state: "in_progress",
    });

    const mvpDialog = page.getByRole("dialog", { name: "MVP Nomination" });
    await nav.goToGame(home.name, away.name);
    await page.getByRole("button", { name: "Done — end game" }).click();
    for (let i = 1; i <= 6; i++) {
      await mvpDialog
        .getByRole("group", { name: home.name })
        .getByRole("checkbox", { name: `#${i}`, exact: true })
        .check();
      await mvpDialog
        .getByRole("group", { name: away.name })
        .getByRole("checkbox", { name: `#${i}`, exact: true })
        .check();
    }
    await mvpDialog.getByRole("button", { name: "Submit Nominations" }).click();

    await expect(
      page.getByRole("button", {
        name: /There was an error with your submission/,
      }),
    ).toBeVisible();
  });

  test("the coach of one of the teams can start the game", async ({
    page,
    nav,
    seed,
    leagueId,
    adminUserId,
    userId,
  }) => {
    const home = await seed.team(leagueId, adminUserId, { state: "ready" });
    const away = await seed.team(leagueId, userId, { state: "ready" });
    const season = await seed.season(leagueId, { isActive: true });
    await seed.game(leagueId, home.teamId, away.teamId, {
      seasonId: season.seasonId,
    });

    await nav.goToGame(home.name, away.name);
    await page.getByRole("button", { name: "Play!!!" }).click();

    await expect(page.getByRole("link", { name: "Continue" })).toBeVisible();
  });
});

test.describe("as the league admin", () => {
  test("a coach of neither team can start the game", async ({
    page,
    nav,
    seed,
    leagueId,
    memberUserId,
  }) => {
    const home = await seed.team(leagueId, memberUserId, { state: "ready" });
    const away = await seed.team(leagueId, memberUserId, { state: "ready" });
    const season = await seed.season(leagueId, { isActive: true });
    await seed.game(leagueId, home.teamId, away.teamId, {
      seasonId: season.seasonId,
    });

    await nav.goToGame(home.name, away.name);
    await page.getByRole("button", { name: "Play!!!" }).click();

    await expect(page.getByRole("link", { name: "Continue" })).toBeVisible();
  });
});

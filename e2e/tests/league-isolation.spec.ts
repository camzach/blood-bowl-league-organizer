import { test, expect } from "../fixtures/index";

test.describe("data from another league", () => {
  test("a team in another league shows a not found page", async ({
    page,
    seed,
    otherLeague,
  }) => {
    const team = await seed.team(
      otherLeague.leagueId,
      otherLeague.admin.userId,
    );

    await page.goto(`/team/${team.teamId}`);

    await expect(
      page.getByRole("heading", { name: "404 - Not Found" }),
    ).toBeVisible();
    await expect(page.getByText(team.name)).toBeHidden();
  });

  test("a team in another league cannot be edited", async ({
    page,
    seed,
    otherLeague,
  }) => {
    const team = await seed.team(
      otherLeague.leagueId,
      otherLeague.admin.userId,
      {
        state: "hiring",
      },
    );

    await page.goto(`/team/${team.teamId}/edit`);

    await expect(page).toHaveURL("/");
  });

  test("a game in another league shows a not found page", async ({
    page,
    seed,
    otherLeague,
  }) => {
    const adminId = otherLeague.admin.userId;
    const home = await seed.team(otherLeague.leagueId, adminId);
    const away = await seed.team(otherLeague.leagueId, adminId);
    const game = await seed.game(home.teamId, away.teamId);

    await page.goto(`/game/${game.gameId}`);

    await expect(
      page.getByRole("heading", { name: "404 - Not Found" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Play!!!" })).toBeHidden();
  });

  test("a game between teams of two different leagues shows a not found page", async ({
    page,
    seed,
    leagueId,
    userId,
    otherLeague,
  }) => {
    const home = await seed.team(leagueId, userId);
    const away = await seed.team(
      otherLeague.leagueId,
      otherLeague.admin.userId,
    );
    const game = await seed.game(home.teamId, away.teamId);

    await page.goto(`/game/${game.gameId}`);

    await expect(
      page.getByRole("heading", { name: "404 - Not Found" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Play!!!" })).toBeHidden();
  });

  test("a game in the user's own league still opens", async ({
    page,
    seed,
    leagueId,
    userId,
  }) => {
    const home = await seed.team(leagueId, userId);
    const away = await seed.team(leagueId, userId);
    const game = await seed.game(home.teamId, away.teamId);

    await page.goto(`/game/${game.gameId}`);

    await expect(page.getByRole("button", { name: "Play!!!" })).toBeVisible();
  });
});

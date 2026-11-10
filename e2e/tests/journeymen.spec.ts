import { test, expect } from "../fixtures/index";

test("journeymen: both teams short on players pick journeymen before inducements", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  const home = await seed.team(leagueId, userId, {
    state: "playing",
    playerCount: 9,
  });
  const away = await seed.team(leagueId, userId, {
    state: "playing",
    playerCount: 10,
  });
  const season = await seed.season(leagueId, { isActive: true });
  await seed.game(leagueId, home.teamId, away.teamId, {
    seasonId: season.seasonId,
    state: "journeymen",
  });

  const homeGroup = page.getByRole("group", {
    name: `${home.name} - Need 2 Journeymen`,
  });
  const awayGroup = page.getByRole("group", {
    name: `${away.name} - Need 1 Journeymen`,
  });
  const submit = page.getByRole("button", { name: "Submit!" });

  await test.step("each team shows how many journeymen it needs", async () => {
    await nav.goToGame(home.name, away.name);
    await expect(homeGroup).toBeVisible();
    await expect(awayGroup).toBeVisible();
    await expect(submit).toBeDisabled();
  });

  await test.step("submitting stays disabled until both teams have chosen", async () => {
    await homeGroup.getByRole("radio").first().check();
    await expect(submit).toBeDisabled();

    await awayGroup.getByRole("radio").first().check();
    await expect(submit).toBeEnabled();
  });

  await test.step("the journeymen join their teams for the game", async () => {
    await submit.click();
    await page.getByRole("button", { name: "Done :)" }).click();
    await expect(
      page.getByRole("button", { name: "Done — end game" }),
    ).toBeVisible();
    await expect(page.getByText("Journeymen", { exact: true })).toHaveCount(2);
    await expect(
      page.getByRole("cell", { name: "99", exact: true }),
    ).toHaveCount(2);
    await expect(
      page.getByRole("cell", { name: "98", exact: true }),
    ).toHaveCount(1);
  });
});

test("journeymen: only the team short on players is asked to choose", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  const home = await seed.team(leagueId, userId, {
    state: "playing",
    playerCount: 9,
  });
  const away = await seed.team(leagueId, userId, {
    state: "playing",
    playerCount: 11,
  });
  const season = await seed.season(leagueId, { isActive: true });
  await seed.game(leagueId, home.teamId, away.teamId, {
    seasonId: season.seasonId,
    state: "journeymen",
  });

  await test.step("only the home team has a choice to make", async () => {
    await nav.goToGame(home.name, away.name);
    await expect(
      page.getByRole("group", { name: `${home.name} - Need 2 Journeymen` }),
    ).toBeVisible();
    await expect(page.getByRole("group")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Submit!" })).toBeDisabled();
  });

  await test.step("choosing for the home team is enough to continue", async () => {
    await page
      .getByRole("group", { name: `${home.name} - Need 2 Journeymen` })
      .getByRole("radio")
      .first()
      .check();
    await page.getByRole("button", { name: "Submit!" }).click();
    await expect(page.getByRole("button", { name: "Done :)" })).toBeVisible();
  });
});

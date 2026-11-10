import { test, expect } from "../fixtures/index";

test("inducements: skipping inducements starts the game", async ({
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
    state: "inducements",
  });

  await nav.goToGame(home.name, away.name);
  await page.getByRole("button", { name: "Done :)" }).click();

  await expect(
    page.getByRole("button", { name: "Done — end game" }),
  ).toBeVisible();
});

test("inducements: the underdog spends petty cash topped up by the opponent", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  const home = await seed.team(leagueId, userId, {
    state: "ready",
    playerCount: 11,
  });
  const away = await seed.team(leagueId, userId, {
    state: "ready",
    playerCount: 12,
  });
  const season = await seed.season(leagueId, { isActive: true });
  await seed.game(leagueId, home.teamId, away.teamId, {
    seasonId: season.seasonId,
  });

  const homeOptions = page.getByRole("region", {
    name: `${home.name} inducements`,
  });
  const awayOptions = page.getByRole("region", {
    name: `${away.name} inducements`,
  });
  const homeCheerleaders = homeOptions.getByRole("listitem").filter({
    has: page.getByRole("spinbutton", { name: "Temp Agency Cheerleader" }),
  });
  const homeMascot = homeOptions.getByRole("listitem").filter({
    has: page.getByRole("spinbutton", { name: "Team Mascot" }),
  });
  const homeWizard = homeOptions.getByRole("spinbutton", { name: "Wizard" });
  const awayCheerleaders = awayOptions.getByRole("spinbutton", {
    name: "Temp Agency Cheerleader",
  });

  await test.step("the cheaper team is awarded petty cash", async () => {
    await nav.goToGame(home.name, away.name);
    await page.getByRole("button", { name: "Play" }).click();
    await page.getByRole("link", { name: "Continue" }).click();
    await expect(page.getByText("Petty Cash: 50000")).toBeVisible();
    await expect(page.getByText("Treasury: 1000000")).toBeVisible();
    await expect(page.getByText("Total Cost: 0")).toHaveCount(2);
  });

  await test.step("inducements within the petty cash leave it reduced", async () => {
    await homeCheerleaders
      .getByRole("button", { name: "+", exact: true })
      .click();
    await homeCheerleaders
      .getByRole("button", { name: "+", exact: true })
      .click();
    await expect(
      homeCheerleaders.getByRole("spinbutton", {
        name: "Temp Agency Cheerleader",
      }),
    ).toHaveValue("2");
    await expect(page.getByText("Total Cost: 10000")).toBeVisible();
    await expect(page.getByText("Petty Cash: 40000")).toBeVisible();
  });

  await test.step("an inducement cannot go past its maximum or below zero", async () => {
    await homeMascot.getByRole("button", { name: "+", exact: true }).click();
    await expect(
      homeMascot.getByRole("button", { name: "+", exact: true }),
    ).toBeDisabled();
    await homeMascot.getByRole("button", { name: "-", exact: true }).click();
    await expect(
      homeMascot.getByRole("button", { name: "-", exact: true }),
    ).toBeDisabled();
  });

  await test.step("the opponent's purchases are paid by them and top up the petty cash", async () => {
    await awayCheerleaders.fill("1");
    await expect(page.getByText("Treasury: 995000")).toBeVisible();
    await expect(
      page.getByText(/Treasury Transfer\s*<==\s*5000/),
    ).toBeVisible();
    await expect(page.getByText("Petty Cash: 45000")).toBeVisible();
  });

  await test.step("the underdog cannot spend its own treasury past the petty cash", async () => {
    await homeWizard.fill("1");
    await page.getByRole("button", { name: "Done :)" }).click();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Inducements are too expensive" }),
    ).toBeVisible();
    await homeWizard.fill("0");
  });

  await test.step("confirming starts the game with the purchases", async () => {
    await page.getByRole("button", { name: "Done :)" }).click();
    await expect(
      page.getByRole("button", { name: "Done — end game" }),
    ).toBeVisible();
    await expect(page.getByText("Cheerleaders: 2")).toBeVisible();
  });

  await test.step("only the opponent's treasury spending is deducted", async () => {
    await nav.goToTeam(home.name);
    await expect(page.getByText("Treasury -- 1000000")).toBeVisible();
    await nav.goToTeam(away.name);
    await expect(page.getByText("Treasury -- 995000")).toBeVisible();
  });
});

test("inducements: typing past the maximum is clamped", async ({
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
    state: "inducements",
  });
  await nav.goToGame(home.name, away.name);

  const prayers = page
    .getByRole("region", { name: `${home.name} inducements` })
    .getByRole("spinbutton", { name: "Prayer to Nuffle" });
  await prayers.fill("99");

  await expect(prayers).toHaveValue("3");
  await expect(page.getByText("Total Cost: 30000")).toBeVisible();
});

test("inducements: a team can hire at most two star players", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  const home = await seed.team(leagueId, userId, {
    state: "ready",
    playerCount: 11,
  });
  const away = await seed.team(leagueId, userId, {
    state: "ready",
    playerCount: 16,
  });
  const season = await seed.season(leagueId, { isActive: true });
  await seed.game(leagueId, home.teamId, away.teamId, {
    seasonId: season.seasonId,
  });

  const homeOptions = page.getByRole("region", {
    name: `${home.name} inducements`,
  });
  const akhorne = homeOptions.getByRole("checkbox", { name: /Akhorne/ });
  const dribl = homeOptions.getByRole("checkbox", { name: /Dribl/ });
  const crumbleberry = homeOptions.getByRole("checkbox", {
    name: /Crumbleberry/,
  });

  await test.step("two stars are chosen and the rest are locked", async () => {
    await nav.goToGame(home.name, away.name);
    await page.getByRole("button", { name: "Play" }).click();
    await page.getByRole("link", { name: "Continue" }).click();
    await akhorne.check();
    await dribl.check();
    await expect(crumbleberry).toBeDisabled();
    await expect(page.getByText("Total Cost: 175000")).toBeVisible();
  });

  await test.step("dropping a star unlocks the others", async () => {
    await dribl.uncheck();
    await expect(crumbleberry).toBeEnabled();
    await expect(page.getByText("Total Cost: 80000")).toBeVisible();
  });

  await test.step("the hired star plays in the game", async () => {
    await page.getByRole("button", { name: "Done :)" }).click();
    await expect(
      page.getByRole("main").getByText("Star Players", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Akhorne The Squirrel" }).first(),
    ).toBeVisible();
  });
});

test("inducements: buying more than petty cash and treasury allow shows an error", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  const home = await seed.team(leagueId, userId, {
    state: "ready",
    playerCount: 11,
    treasury: 0,
  });
  const away = await seed.team(leagueId, userId, {
    state: "ready",
    playerCount: 12,
    treasury: 0,
  });
  const season = await seed.season(leagueId, { isActive: true });
  await seed.game(leagueId, home.teamId, away.teamId, {
    seasonId: season.seasonId,
  });

  const homeOptions = page.getByRole("region", {
    name: `${home.name} inducements`,
  });

  await test.step("a purchase beyond the petty cash is rejected", async () => {
    await nav.goToGame(home.name, away.name);
    await page.getByRole("button", { name: "Play" }).click();
    await page.getByRole("link", { name: "Continue" }).click();
    await homeOptions.getByRole("spinbutton", { name: "Wizard" }).fill("1");
    await page.getByRole("button", { name: "Done :)" }).click();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Inducements are too expensive" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Done :)" })).toBeEnabled();
  });

  await test.step("reducing the purchase to fit the petty cash is accepted", async () => {
    await homeOptions.getByRole("spinbutton", { name: "Wizard" }).fill("0");
    await homeOptions
      .getByRole("spinbutton", { name: "Temp Agency Cheerleader" })
      .fill("2");
    await page.getByRole("button", { name: "Done :)" }).click();
    await expect(
      page.getByRole("button", { name: "Done — end game" }),
    ).toBeVisible();
  });
});

test("inducements: teams of equal value have no petty cash to spend", async ({
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
    state: "inducements",
  });
  await nav.goToGame(home.name, away.name);

  await page
    .getByRole("region", { name: `${home.name} inducements` })
    .getByRole("spinbutton", { name: "Temp Agency Cheerleader" })
    .fill("1");
  await page.getByRole("button", { name: "Done :)" }).click();

  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Inducements are too expensive" }),
  ).toBeVisible();
});

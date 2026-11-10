import { test, expect } from "../fixtures/index";

test("end-game: events are scored, nominated and recorded as a finished game", async ({
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
    state: "in_progress",
  });

  const touchdownDialog = page.getByRole("dialog", {
    name: "Record Touchdown",
  });
  const casualtyDialog = page.getByRole("dialog", { name: "Record Casualty" });
  const historyDialog = page.getByRole("dialog", { name: "History" });
  const mvpDialog = page.getByRole("dialog", { name: "MVP Nomination" });
  const resultsDialog = page.getByRole("dialog", {
    name: "Post-Game Sequence",
  });

  await test.step("the game starts at nil-nil", async () => {
    await nav.goToGame(home.name, away.name);
    await expect(page.getByText("Touchdowns 0")).toBeVisible();
    await expect(page.getByText("0 Touchdowns")).toBeVisible();
    await expect(page.getByText("Casualties 0")).toBeVisible();
    await expect(page.getByText("0 Casualties")).toBeVisible();
  });

  await test.step("record two home touchdowns and one away touchdown", async () => {
    await page
      .getByRole("button", { name: `Record touchdown for ${home.name}` })
      .click();
    await touchdownDialog
      .getByRole("combobox", { name: "Scored By:" })
      .selectOption({ label: "3" });
    await touchdownDialog.getByRole("button", { name: "Done" }).click();
    await expect(touchdownDialog).toBeHidden();
    await expect(page.getByText("Touchdowns 1")).toBeVisible();

    await page
      .getByRole("button", { name: `Record touchdown for ${home.name}` })
      .click();
    await touchdownDialog
      .getByRole("combobox", { name: "Scored By:" })
      .selectOption({ label: "4" });
    await touchdownDialog.getByRole("button", { name: "Done" }).click();
    await expect(touchdownDialog).toBeHidden();
    await expect(page.getByText("Touchdowns 2")).toBeVisible();

    await page
      .getByRole("button", { name: `Record touchdown for ${away.name}` })
      .click();
    await touchdownDialog
      .getByRole("combobox", { name: "Scored By:" })
      .selectOption({ label: "5" });
    await touchdownDialog.getByRole("button", { name: "Done" }).click();
    await expect(touchdownDialog).toBeHidden();
    await expect(page.getByText("1 Touchdowns")).toBeVisible();
  });

  await test.step("record a casualty caused by a home player", async () => {
    await page
      .getByRole("button", { name: `Record casualty caused by ${home.name}` })
      .click();
    await casualtyDialog
      .getByRole("combobox", { name: "Injured Player:" })
      .selectOption({ label: "2" });
    await casualtyDialog
      .getByRole("combobox", { name: "Type of injury:" })
      .selectOption({ label: "Dead" });
    await casualtyDialog
      .getByRole("combobox", { name: "Caused By:" })
      .selectOption({ label: "1" });
    await casualtyDialog.getByRole("button", { name: "Done" }).click();
    await expect(page.getByText("Casualties 1")).toBeVisible();
  });

  await test.step("the history lists every event and lets one be removed", async () => {
    await page.getByRole("button", { name: "History" }).click();
    const events = historyDialog.getByRole("listitem");
    await expect(events).toHaveText([
      /Touchdown scored by 3/,
      /Touchdown scored by 4/,
      /Touchdown scored by 5/,
      /2 was killed by 1/,
    ]);

    await events
      .filter({ hasText: "Touchdown scored by 5" })
      .getByRole("button", { name: "Remove event" })
      .click();
    await expect(events).toHaveCount(3);
    await historyDialog.getByRole("button", { name: "Close" }).click();
    await expect(page.getByText("0 Touchdowns")).toBeVisible();
    await expect(page.getByText("Touchdowns 2")).toBeVisible();
  });

  await test.step("a player killed in the game is not offered as an MVP nominee", async () => {
    await page.getByRole("button", { name: "Done — end game" }).click();
    const awayGroup = mvpDialog.getByRole("group", { name: away.name });
    const homeGroup = mvpDialog.getByRole("group", { name: home.name });
    await expect(homeGroup.getByRole("checkbox")).toHaveCount(12);
    await expect(
      awayGroup.getByRole("checkbox", { name: "#2", exact: true }),
    ).toBeHidden();
    await expect(awayGroup.getByRole("checkbox")).toHaveCount(11);
  });

  await test.step("nominate six players per team and submit", async () => {
    const homeGroup = mvpDialog.getByRole("group", { name: home.name });
    const awayGroup = mvpDialog.getByRole("group", { name: away.name });
    for (const number of [1, 3, 4, 5, 6, 7]) {
      await homeGroup
        .getByRole("checkbox", { name: `#${number}`, exact: true })
        .check();
      await awayGroup
        .getByRole("checkbox", { name: `#${number}`, exact: true })
        .check();
    }
    await mvpDialog.getByRole("button", { name: "Submit Nominations" }).click();
    await expect(resultsDialog).toBeVisible();
    await expect(
      resultsDialog.getByRole("row").filter({ hasText: home.name }),
    ).toBeVisible();
    await expect(
      resultsDialog.getByRole("row").filter({ hasText: away.name }),
    ).toBeVisible();
  });

  await test.step("the finished game shows its final result", async () => {
    await resultsDialog.getByRole("button", { name: "Close" }).click();
    await page.reload();
    await expect(
      page.getByRole("columnheader", { name: home.name }),
    ).toBeVisible();
    const score = page.getByRole("row").filter({ hasText: /^Score/ });
    await expect(score.getByRole("cell")).toHaveText(["Score", "2", "0"]);
    const casualties = page.getByRole("row").filter({ hasText: /^Casualties/ });
    await expect(casualties.getByRole("cell")).toHaveText([
      "Casualties",
      "1",
      "0",
    ]);
  });

  await test.step("both teams move on to improving", async () => {
    await nav.goToTeam(home.name);
    await expect(page.getByRole("link", { name: "Edit" })).toBeVisible();
    await nav.goToTeam(away.name);
    await expect(page.getByRole("link", { name: "Edit" })).toBeVisible();
  });
});

test("end-game: MVP nominations need exactly six players per team", async ({
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
    state: "in_progress",
  });

  const mvpDialog = page.getByRole("dialog", { name: "MVP Nomination" });
  const homeGroup = mvpDialog.getByRole("group", { name: home.name });
  const awayGroup = mvpDialog.getByRole("group", { name: away.name });
  const submit = mvpDialog.getByRole("button", { name: "Submit Nominations" });

  await test.step("nothing is nominated to begin with", async () => {
    await nav.goToGame(home.name, away.name);
    await page.getByRole("button", { name: "Done — end game" }).click();
    await expect(submit).toBeDisabled();
  });

  await test.step("one team nominating six is not enough", async () => {
    for (let i = 1; i <= 6; i++) {
      await homeGroup
        .getByRole("checkbox", { name: `#${i}`, exact: true })
        .check();
    }
    await expect(submit).toBeDisabled();
  });

  await test.step("a team cannot nominate a seventh player", async () => {
    await expect(
      homeGroup.getByRole("checkbox", { name: "#7", exact: true }),
    ).toBeDisabled();
    await expect(
      awayGroup.getByRole("checkbox", { name: "#7", exact: true }),
    ).toBeEnabled();
  });

  await test.step("five nominations on the other team still do not submit", async () => {
    for (let i = 1; i <= 5; i++) {
      await awayGroup
        .getByRole("checkbox", { name: `#${i}`, exact: true })
        .check();
    }
    await expect(submit).toBeDisabled();
  });

  await test.step("withdrawing a nomination frees up a place", async () => {
    await homeGroup
      .getByRole("checkbox", { name: "#6", exact: true })
      .uncheck();
    await expect(
      homeGroup.getByRole("checkbox", { name: "#7", exact: true }),
    ).toBeEnabled();
    await expect(submit).toBeDisabled();
  });

  await test.step("six on each team enables submitting", async () => {
    await homeGroup.getByRole("checkbox", { name: "#6", exact: true }).check();
    await awayGroup.getByRole("checkbox", { name: "#6", exact: true }).check();
    await expect(submit).toBeEnabled();
  });

  await test.step("the stalling option can be chosen", async () => {
    await homeGroup
      .getByRole("checkbox", { name: "Stalled this game" })
      .check();
    await expect(
      homeGroup.getByRole("checkbox", { name: "Stalled this game" }),
    ).toBeChecked();
    await expect(
      awayGroup.getByRole("checkbox", { name: "Stalled this game" }),
    ).not.toBeChecked();
  });
});

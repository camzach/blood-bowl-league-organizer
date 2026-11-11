import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures/index";

const playerRow = (page: Page, number: number) =>
  page.getByRole("row").filter({
    has: page.getByRole("cell", { name: String(number), exact: true }),
  });

test.describe("improving players", () => {
  test("a player with too little SPP cannot spend any", async ({
    page,
    nav,
    seed,
    leagueId,
    userId,
  }) => {
    const team = await seed.team(leagueId, userId, {
      state: "improving",
      firstPlayerSPP: 2,
    });
    await page.reload();
    await nav.goToTeamEdit(team.name);

    await expect(
      playerRow(page, 1).getByRole("button", { name: "Spend SPP" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Done improving players" }),
    ).toBeEnabled();
  });

  test("with 3 SPP only a random primary skill is affordable", async ({
    page,
    nav,
    seed,
    leagueId,
    userId,
  }) => {
    const team = await seed.team(leagueId, userId, {
      state: "improving",
      firstPlayerSPP: 3,
    });
    await page.reload();
    await nav.goToTeamEdit(team.name);

    await playerRow(page, 1).getByRole("button", { name: "Spend SPP" }).click();
    const dialog = page.getByRole("dialog", { name: "Advance Player" });

    await expect(
      dialog.getByRole("button", { name: "Random - 3 SPP" }),
    ).toBeEnabled();
    await expect(dialog.getByRole("button", { name: "Block" })).toBeDisabled();
  });

  test("a chosen primary skill costs 6 SPP and the next random skill costs 4", async ({
    page,
    nav,
    seed,
    leagueId,
    userId,
  }) => {
    const team = await seed.team(leagueId, userId, {
      state: "improving",
      firstPlayerSPP: 10,
    });
    await page.reload();
    await nav.goToTeamEdit(team.name);

    const dialog = page.getByRole("dialog", { name: "Advance Player" });

    await test.step("every general skill is affordable, and the random skill costs 3", async () => {
      await playerRow(page, 1)
        .getByRole("button", { name: "Spend SPP" })
        .click();

      await expect(dialog.getByRole("button", { name: "Block" })).toBeEnabled();
      await expect(
        dialog.getByRole("button", { name: "Random - 3 SPP" }),
      ).toBeEnabled();
    });

    await test.step("learn Block for 6 SPP", async () => {
      await dialog.getByRole("button", { name: "Block", exact: true }).click();

      await expect(
        playerRow(page, 1).getByText("Block", { exact: true }),
      ).toBeVisible();
      await expect(
        playerRow(page, 1).getByRole("cell", { name: "4", exact: true }),
      ).toBeVisible();
    });

    await test.step("the next random skill costs 4 and Block is taken", async () => {
      await playerRow(page, 1)
        .getByRole("button", { name: "Spend SPP" })
        .click();

      await expect(
        dialog.getByRole("button", { name: "Random - 4 SPP" }),
      ).toBeEnabled();
      await expect(
        dialog.getByRole("button", { name: "Block", exact: true }),
      ).toBeDisabled();
    });
  });

  test("a chosen secondary skill costs 10 SPP", async ({
    page,
    nav,
    seed,
    leagueId,
    userId,
  }) => {
    const team = await seed.team(leagueId, userId, {
      state: "improving",
      firstPlayerSPP: 10,
    });
    await page.reload();
    await nav.goToTeamEdit(team.name);

    await playerRow(page, 1).getByRole("button", { name: "Spend SPP" }).click();
    const dialog = page.getByRole("dialog", { name: "Advance Player" });
    await dialog.getByRole("tab", { name: "Agility" }).click();
    await expect(
      dialog.getByRole("button", { name: "Catch", exact: true }),
    ).toBeEnabled();

    await dialog.getByRole("button", { name: "Catch", exact: true }).click();

    await expect(
      playerRow(page, 1).getByText("Catch", { exact: true }),
    ).toBeVisible();
    await expect(
      playerRow(page, 1).getByRole("button", { name: "Spend SPP" }),
    ).toBeDisabled();
  });

  test("with 9 SPP a secondary skill is out of reach", async ({
    page,
    nav,
    seed,
    leagueId,
    userId,
  }) => {
    const team = await seed.team(leagueId, userId, {
      state: "improving",
      firstPlayerSPP: 9,
    });
    await page.reload();
    await nav.goToTeamEdit(team.name);

    await playerRow(page, 1).getByRole("button", { name: "Spend SPP" }).click();
    const dialog = page.getByRole("dialog", { name: "Advance Player" });

    await expect(dialog.getByRole("button", { name: "Block" })).toBeEnabled();
    await expect(dialog.getByRole("tab", { name: "Agility" })).toBeDisabled();
    await expect(dialog.getByRole("tab", { name: "Stat" })).toBeDisabled();
  });

  test("a stat increase costs 14 SPP and blocks finishing until it is resolved", async ({
    page,
    nav,
    seed,
    leagueId,
    userId,
  }) => {
    const team = await seed.team(leagueId, userId, {
      state: "improving",
      firstPlayerSPP: 14,
    });
    await page.reload();
    await nav.goToTeamEdit(team.name);

    await playerRow(page, 1).getByRole("button", { name: "Spend SPP" }).click();
    const dialog = page.getByRole("dialog", { name: "Advance Player" });
    await dialog.getByRole("tab", { name: "Stat" }).click();

    await dialog
      .getByRole("button", { name: "Roll for Stat Increase" })
      .click();

    await expect(
      page.getByRole("button", { name: "Done improving players" }),
    ).toBeDisabled();

    await playerRow(page, 1).getByRole("button", { name: "Spend SPP" }).click();
    await expect(
      dialog.getByText(/You rolled a [1-8] for a stat increase/),
    ).toBeVisible();
  });
});

test.describe("resolving a pending stat increase", () => {
  test("a roll of 8 offers every stat, and the chosen one is applied", async ({
    page,
    nav,
    seed,
    leagueId,
    userId,
  }) => {
    const team = await seed.team(leagueId, userId, {
      state: "improving",
      firstPlayerSPP: 14,
    });
    await seed.pendingRandomStat(team.playerIds[0], 8);
    await page.reload();
    await nav.goToTeamEdit(team.name);

    const headers = await page
      .getByRole("table")
      .first()
      .getByRole("columnheader")
      .allTextContents();
    expect(headers).toContain("AV");
    const avCell = playerRow(page, 1)
      .getByRole("cell")
      .nth(headers.indexOf("AV"));
    const startingAv = Number.parseInt((await avCell.textContent()) ?? "", 10);

    await expect(
      page.getByRole("button", { name: "Done improving players" }),
    ).toBeDisabled();

    await playerRow(page, 1).getByRole("button", { name: "Spend SPP" }).click();
    const dialog = page.getByRole("dialog", { name: "Advance Player" });

    await test.step("every stat is offered", async () => {
      await expect(
        dialog.getByText("You rolled a 8 for a stat increase"),
      ).toBeVisible();
      for (const stat of ["MA", "ST", "AG", "PA", "AV"]) {
        await expect(
          dialog.getByRole("button", { name: stat, exact: true }),
        ).toBeEnabled();
      }
    });

    await test.step("choose AV", async () => {
      await dialog.getByRole("button", { name: "AV", exact: true }).click();

      await expect(avCell).toHaveText(`${startingAv + 1}+`);
      await expect(
        page.getByRole("button", { name: "Done improving players" }),
      ).toBeEnabled();
    });
  });

  test("a roll of 1 offers only AV", async ({
    page,
    nav,
    seed,
    leagueId,
    userId,
  }) => {
    const team = await seed.team(leagueId, userId, {
      state: "improving",
      firstPlayerSPP: 14,
    });
    await seed.pendingRandomStat(team.playerIds[0], 1);
    await page.reload();
    await nav.goToTeamEdit(team.name);

    await playerRow(page, 1).getByRole("button", { name: "Spend SPP" }).click();
    const dialog = page.getByRole("dialog", { name: "Advance Player" });

    await expect(
      dialog.getByRole("button", { name: "AV", exact: true }),
    ).toBeEnabled();
    for (const stat of ["MA", "ST", "AG", "PA"]) {
      await expect(
        dialog.getByRole("button", { name: stat, exact: true }),
      ).toHaveCount(0);
    }
  });

  test("a skill can be taken instead of a stat", async ({
    page,
    nav,
    seed,
    leagueId,
    userId,
  }) => {
    const team = await seed.team(leagueId, userId, {
      state: "improving",
      firstPlayerSPP: 14,
    });
    await seed.pendingRandomStat(team.playerIds[0], 1);
    await page.reload();
    await nav.goToTeamEdit(team.name);

    await playerRow(page, 1).getByRole("button", { name: "Spend SPP" }).click();
    const dialog = page.getByRole("dialog", { name: "Advance Player" });
    await expect(
      dialog.getByRole("button", { name: "Confirm" }),
    ).toBeDisabled();

    await dialog.getByRole("combobox").selectOption("Block");
    await dialog.getByRole("button", { name: "Confirm" }).click();

    await expect(
      playerRow(page, 1).getByText("Block", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Done improving players" }),
    ).toBeEnabled();
  });
});

test("a pending random skill is resolved by choosing one of the two options", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  const team = await seed.team(leagueId, userId, {
    state: "improving",
    firstPlayerSPP: 3,
  });
  await seed.pendingRandomSkill(
    team.playerIds[0],
    "general",
    "Block",
    "Dauntless",
  );
  await page.reload();
  await nav.goToTeamEdit(team.name);

  await expect(
    page.getByRole("button", { name: "Done improving players" }),
  ).toBeDisabled();

  await playerRow(page, 1).getByRole("button", { name: "Spend SPP" }).click();
  const dialog = page.getByRole("dialog", { name: "Advance Player" });
  await expect(
    dialog.getByText("Choose one of the following random skills:"),
  ).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Block" })).toBeEnabled();

  await dialog.getByRole("button", { name: "Dauntless" }).click();

  await expect(
    playerRow(page, 1).getByText("Dauntless", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Done improving players" }),
  ).toBeEnabled();
});

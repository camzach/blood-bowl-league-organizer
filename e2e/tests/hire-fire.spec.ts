import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures/index";

const playerRow = (page: Page, number: number) =>
  page.getByRole("row").filter({
    has: page.getByRole("cell", { name: String(number), exact: true }),
  });

const staffRow = (page: Page, name: string) =>
  page.getByRole("row").filter({
    has: page.getByRole("cell", { name, exact: true }),
  });

test.describe("hiring and firing", () => {
  test("a team hires a player, finishes hiring, then fires down to 11", async ({
    page,
    nav,
    seed,
    leagueId,
    userId,
  }) => {
    const team = await seed.team(leagueId, userId, {
      state: "hiring",
      playerCount: 11,
      treasury: 60_000,
    });
    await page.reload();
    await nav.goToTeamEdit(team.name);

    await test.step("while hiring, players can be hired but not fired", async () => {
      await expect(page.getByRole("button", { name: "HIRE!!!" })).toBeEnabled();
      await expect(
        page.getByRole("button", { name: "Done hiring players" }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Fire!" })).toHaveCount(0);
      await expect(page.getByText("Treasury -- 60000")).toBeVisible();
      await expect(
        page.getByRole("option", { name: "Eagle Warrior - 50000" }),
      ).toBeEnabled();
    });

    await test.step("hire a new player as #12", async () => {
      await page
        .getByRole("combobox", { name: "Player number" })
        .selectOption("12");
      await page.getByRole("button", { name: "HIRE!!!" }).click();

      await expect(playerRow(page, 12)).toBeVisible();
      await expect(page.getByText("Treasury -- 10000")).toBeVisible();
      await expect(
        page.getByRole("option", { name: "Eagle Warrior - 50000" }),
      ).toBeDisabled();
    });

    await test.step("finish hiring", async () => {
      await page.getByRole("button", { name: "Done hiring players" }).click();

      await expect(
        playerRow(page, 12).getByRole("button", { name: "Fire!" }),
      ).toBeEnabled();
      await expect(
        page.getByRole("button", { name: "HIRE!!!" }),
      ).toBeDisabled();
      await expect(
        page.getByRole("combobox", { name: "Position" }),
      ).toBeDisabled();
      await expect(
        page.getByRole("combobox", { name: "Player number" }),
      ).toBeDisabled();
    });

    await test.step("fire the new hire, after which nobody else can be fired and nothing is refunded", async () => {
      const firstPlayerFire = playerRow(page, 1).getByRole("button", {
        name: "Fire!",
      });
      await expect(firstPlayerFire).toBeEnabled();

      await playerRow(page, 12).getByRole("button", { name: "Fire!" }).click();

      await expect(playerRow(page, 12)).not.toBeAttached();
      await expect(firstPlayerFire).toBeDisabled();
      await expect(page.getByText("Treasury -- 10000")).toBeVisible();
    });
  });

  test("positions the treasury cannot cover are disabled", async ({
    page,
    nav,
    seed,
    leagueId,
    userId,
  }) => {
    const team = await seed.team(leagueId, userId, {
      state: "hiring",
      treasury: 60_000,
    });
    await page.reload();
    await nav.goToTeamEdit(team.name);

    await expect(
      page.getByRole("option", { name: "Eagle Warrior - 50000" }),
    ).toBeEnabled();
    await expect(
      page.getByRole("option", { name: "Python Warrior - 80000" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("option", { name: "Jaguar Warrior - 110000" }),
    ).toBeDisabled();
  });

  test("hiring without enough gold shows an error and leaves the treasury alone", async ({
    page,
    nav,
    seed,
    leagueId,
    userId,
  }) => {
    const team = await seed.team(leagueId, userId, {
      state: "hiring",
      treasury: 0,
    });
    await page.reload();
    await nav.goToTeamEdit(team.name);

    await page.getByRole("button", { name: "HIRE!!!" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "Cannot afford this player" }),
    ).toBeVisible();
    await expect(page.getByText("Treasury -- 0")).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Player number" }),
    ).toHaveValue("12");
  });

  test("a team with only 11 players cannot fire any of them", async ({
    page,
    nav,
    seed,
    leagueId,
    userId,
  }) => {
    const team = await seed.team(leagueId, userId, {
      state: "firing",
      playerCount: 11,
    });
    await page.reload();
    await nav.goToTeamEdit(team.name);

    for (const number of [1, 11]) {
      const fireButton = playerRow(page, number).getByRole("button", {
        name: "Fire!",
      });
      await expect(fireButton).toBeDisabled();
      await expect(fireButton).toHaveAccessibleDescription(
        "A team must keep at least 11 players eligible for the next game",
      );
    }
  });

  test("after the draft, rerolls cost double, can only be bought while hiring and are not refunded when fired", async ({
    page,
    nav,
    seed,
    leagueId,
    userId,
  }) => {
    const team = await seed.team(leagueId, userId, { state: "hiring" });
    await page.reload();
    await nav.goToTeamEdit(team.name);

    const rerolls = staffRow(page, "Rerolls");
    const rerollCount = rerolls.getByRole("spinbutton");
    const plus = rerolls.getByRole("button", { name: "+", exact: true });
    const minus = rerolls.getByRole("button", { name: "-", exact: true });

    await test.step("while hiring, staff cannot be fired and dedicated fans are fixed", async () => {
      await expect(minus).toBeDisabled();
      await expect(plus).toBeEnabled();
      await expect(
        page.getByRole("spinbutton", { name: "Dedicated Fans" }),
      ).toHaveCount(0);
    });

    await test.step("hire a reroll at the double price", async () => {
      await plus.click();

      await expect(rerollCount).toHaveValue("1");
      await expect(page.getByText("Treasury -- 880000")).toBeVisible();
    });

    await test.step("finish hiring", async () => {
      await page.getByRole("button", { name: "Done hiring players" }).click();

      await expect(plus).toBeDisabled();
      await expect(minus).toBeEnabled();
    });

    await test.step("fire the reroll without a refund", async () => {
      await minus.click();

      await expect(rerollCount).toHaveValue("0");
      await expect(page.getByText("Treasury -- 880000")).toBeVisible();
    });
  });

  test("staff cannot be bought beyond what the treasury covers", async ({
    page,
    nav,
    seed,
    leagueId,
    userId,
  }) => {
    const team = await seed.team(leagueId, userId, {
      state: "hiring",
      treasury: 20_000,
    });
    await page.reload();
    await nav.goToTeamEdit(team.name);

    await expect(
      staffRow(page, "Rerolls").getByRole("button", { name: "+", exact: true }),
    ).toBeDisabled();
    await expect(
      staffRow(page, "Apothecary").getByRole("checkbox"),
    ).toBeDisabled();

    const assistants = staffRow(page, "Assistant Coaches");
    const assistantCount = assistants.getByRole("spinbutton");
    const plus = assistants.getByRole("button", { name: "+", exact: true });

    await plus.click();
    await expect(assistantCount).toHaveValue("1");
    await plus.click();
    await expect(assistantCount).toHaveValue("2");

    await expect(page.getByText("Treasury -- 0")).toBeVisible();
    await expect(plus).toBeDisabled();
  });
});

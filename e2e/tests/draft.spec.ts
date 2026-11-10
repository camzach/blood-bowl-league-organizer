import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures/index";

const SNOTLING_ROSTER = "Snotling";
const SNOTLING_LINEMAN = "YInpwz9cBpLjESS";
const FUN_HOPPA = "KfgmOKbQvX5AmiE";
const STILTY_RUNNA = "IB9S47SgIjTYzSo";
const FUNGUS_FLINGA = "8G6ifoC6QIG4hoE";

const playerRow = (page: Page, number: number) =>
  page.getByRole("row").filter({
    has: page.getByRole("cell", { name: String(number), exact: true }),
  });

const staffRow = (page: Page, name: string) =>
  page.getByRole("row").filter({
    has: page.getByRole("cell", { name, exact: true }),
  });

test.describe("the draft", () => {
  test("a coach with no team can pick a team to redraft and continue editing it", async ({
    page,
    seed,
    leagueId,
    userId,
  }) => {
    const other = await seed.team(leagueId, userId, { state: "inactive" });
    const team = await seed.team(leagueId, userId, { state: "inactive" });

    await page.goto("/team/new");
    await page
      .getByRole("combobox", { name: "Team to redraft" })
      .selectOption({ label: `${team.name} - Amazon` });
    await page
      .getByRole("button", { name: "Redraft an existing team" })
      .click();

    await expect(
      page.getByRole("heading", { name: team.name, level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Team setup steps" }),
    ).toBeVisible();
    await expect(page.getByText(other.name)).toBeHidden();
  });

  test("firing a player refunds their cost and is allowed below 11 players", async ({
    page,
    nav,
    seed,
    leagueId,
    userId,
  }) => {
    const team = await seed.team(leagueId, userId, {
      state: "draft",
      playerCount: 11,
    });
    await page.reload();
    await nav.goToTeamEdit(team.name);
    await expect(page.getByText("Treasury -- 1000000")).toBeVisible();

    await test.step("hire a player as #12", async () => {
      await page
        .getByRole("combobox", { name: "Player number" })
        .selectOption("12");
      await page.getByRole("button", { name: "HIRE!!!" }).click();

      await expect(playerRow(page, 12)).toBeVisible();
      await expect(page.getByText("Treasury -- 950000")).toBeVisible();
    });

    await test.step("fire them again for a full refund", async () => {
      await playerRow(page, 12).getByRole("button", { name: "Fire!" }).click();

      await expect(playerRow(page, 12)).not.toBeAttached();
      await expect(page.getByText("Treasury -- 1000000")).toBeVisible();
    });

    await test.step("fire an original player, dropping below 11", async () => {
      const firstPlayerFire = playerRow(page, 1).getByRole("button", {
        name: "Fire!",
      });
      await expect(firstPlayerFire).toBeEnabled();

      await firstPlayerFire.click();

      await expect(playerRow(page, 1)).not.toBeAttached();
      await expect(page.getByText("Treasury -- 1050000")).toBeVisible();
      await expect(
        playerRow(page, 11).getByRole("button", { name: "Fire!" }),
      ).toBeEnabled();
    });
  });

  test("firing staff refunds what they cost", async ({
    page,
    nav,
    seed,
    leagueId,
    userId,
  }) => {
    const team = await seed.team(leagueId, userId, { state: "draft" });
    await page.reload();
    await nav.goToTeamEdit(team.name);

    const rerolls = staffRow(page, "Rerolls");
    const apothecary = staffRow(page, "Apothecary");
    const dedicatedFans = page.getByRole("spinbutton", {
      name: "Dedicated Fans",
    });
    await expect(page.getByText("Treasury -- 1000000")).toBeVisible();

    await test.step("hire a reroll", async () => {
      await rerolls.getByRole("button", { name: "+", exact: true }).click();

      await expect(rerolls.getByRole("spinbutton")).toHaveValue("1");
      await expect(page.getByText("Treasury -- 940000")).toBeVisible();
    });

    await test.step("fire the reroll", async () => {
      await rerolls.getByRole("button", { name: "-", exact: true }).click();

      await expect(rerolls.getByRole("spinbutton")).toHaveValue("0");
      await expect(page.getByText("Treasury -- 1000000")).toBeVisible();
    });

    await test.step("hire then fire the apothecary", async () => {
      await apothecary.getByRole("checkbox").click();
      await expect(apothecary.getByRole("checkbox")).toBeChecked();
      await expect(page.getByText("Treasury -- 950000")).toBeVisible();

      await apothecary.getByRole("checkbox").click();
      await expect(apothecary.getByRole("checkbox")).not.toBeChecked();
      await expect(page.getByText("Treasury -- 1000000")).toBeVisible();
    });

    await test.step("buy then release dedicated fans", async () => {
      await dedicatedFans.fill("3");
      await expect(dedicatedFans).toHaveValue("3");
      await expect(page.getByText("Treasury -- 980000")).toBeVisible();

      await dedicatedFans.fill("1");
      await expect(dedicatedFans).toHaveValue("1");
      await expect(page.getByText("Treasury -- 1000000")).toBeVisible();
    });
  });

  test("a team cannot be readied until it has 11 players", async ({
    page,
    nav,
    seed,
    leagueId,
    userId,
  }) => {
    const team = await seed.team(leagueId, userId, {
      state: "draft",
      playerCount: 10,
    });
    await page.reload();
    await nav.goToTeamEdit(team.name);

    await test.step("readying with 10 players is refused", async () => {
      await page.getByRole("button", { name: "Ready for next game" }).click();

      await expect(
        page
          .getByRole("alert")
          .filter({ hasText: "11 players required to draft a team" }),
      ).toBeVisible();
      await expect(
        page.getByRole("listitem").filter({ hasText: "Draft Team" }),
      ).toBeVisible();
    });

    await test.step("hire an 11th player", async () => {
      await page.getByRole("button", { name: "HIRE!!!" }).click();

      await expect(playerRow(page, 11)).toBeVisible();
    });

    await test.step("readying with 11 players leaves the draft", async () => {
      await page.getByRole("button", { name: "Ready for next game" }).click();

      await expect(
        page.getByRole("heading", { name: team.name, level: 1 }),
      ).toBeVisible();
      await expect(
        page.getByRole("list", { name: "Team setup steps" }),
      ).toBeHidden();
    });
  });

  test("a team where Insignificant players outnumber the rest cannot be readied", async ({
    page,
    nav,
    seed,
    leagueId,
    userId,
  }) => {
    const team = await seed.team(leagueId, userId, {
      state: "draft",
      rosterName: SNOTLING_ROSTER,
      positionIds: [
        ...Array(6).fill(SNOTLING_LINEMAN),
        FUN_HOPPA,
        FUN_HOPPA,
        STILTY_RUNNA,
        STILTY_RUNNA,
        FUNGUS_FLINGA,
      ],
    });
    await page.reload();
    await nav.goToTeamEdit(team.name);

    await test.step("6 Snotlings against 5 others is refused", async () => {
      await page.getByRole("button", { name: "Ready for next game" }).click();

      await expect(
        page.getByRole("alert").filter({
          hasText:
            "You may not have more players with Insignificant than without",
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("listitem").filter({ hasText: "Draft Team" }),
      ).toBeVisible();
    });

    await test.step("swap a Snotling for a Fungus Flinga", async () => {
      const snotlings = page.getByRole("cell", {
        name: "Snotling Lineman",
        exact: true,
      });
      await expect(snotlings).toHaveCount(6);

      await page
        .getByRole("row")
        .filter({ has: snotlings })
        .first()
        .getByRole("button", { name: "Fire!" })
        .click();
      await expect(snotlings).toHaveCount(5);

      await page
        .getByRole("combobox", { name: "Position" })
        .selectOption({ label: "Fungus Flinga - 30000" });
      await page.getByRole("button", { name: "HIRE!!!" }).click();

      await expect(
        page.getByRole("cell", { name: "Fungus Flinga" }),
      ).toHaveCount(2);
    });

    await test.step("5 Snotlings against 6 others is allowed", async () => {
      await page.getByRole("button", { name: "Ready for next game" }).click();

      await expect(
        page.getByRole("heading", { name: team.name, level: 1 }),
      ).toBeVisible();
      await expect(
        page.getByRole("list", { name: "Team setup steps" }),
      ).toBeHidden();
    });
  });
});

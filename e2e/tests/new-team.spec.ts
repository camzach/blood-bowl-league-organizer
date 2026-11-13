import { test, expect } from "../fixtures/index";
import nanoid from "~/app/utils/nanoid";

test.describe("new team", () => {
  test("creating a team lands on its page with a full treasury", async ({
    page,
  }) => {
    const name = `Team-${nanoid()}`;
    await page.goto("/team/new");

    await page.getByRole("textbox", { name: "Team name" }).fill(name);
    await page.getByRole("button", { name: "Create a new team" }).click();

    await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
    await expect(page.getByText("Treasury -- 1000000")).toBeVisible();
  });

  test("a new team starts in the draft", async ({ page }) => {
    const name = `Team-${nanoid()}`;
    await page.goto("/team/new");
    await page.getByRole("textbox", { name: "Team name" }).fill(name);
    await page.getByRole("button", { name: "Create a new team" }).click();
    await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();

    await page.getByRole("link", { name: "Edit" }).click();

    await expect(
      page.getByRole("listitem").filter({ hasText: "Draft Team" }),
    ).toBeVisible();
  });

  test("a new team is listed on the coach's home page", async ({ page }) => {
    const name = `Team-${nanoid()}`;
    await page.goto("/team/new");
    await page.getByRole("textbox", { name: "Team name" }).fill(name);
    await page.getByRole("button", { name: "Create a new team" }).click();
    await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();

    await page.goto("/");

    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  });

  test("a roster with optional special rules makes the coach pick one", async ({
    page,
  }) => {
    const name = `Team-${nanoid()}`;
    await page.goto("/team/new");

    await page.getByRole("textbox", { name: "Team name" }).fill(name);
    await page.getByRole("combobox", { name: "Roster" }).selectOption("Norse");

    const specialRule = page.getByRole("combobox", { name: "Special rule" });
    await expect(specialRule.getByRole("option")).toHaveText([
      "Badlands Brawl",
      "Chaos Clash",
      "Favoured of Khorne",
    ]);

    await specialRule.selectOption("Chaos Clash");
    await page.getByRole("button", { name: "Create a new team" }).click();

    await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
  });

  test("a team without a name is refused and the coach stays on the form", async ({
    page,
  }) => {
    await page.goto("/team/new");

    await page.getByRole("button", { name: "Create a new team" }).click();

    await expect(page.getByRole("alert")).toContainText(/name/i);
    await expect(
      page.getByRole("button", { name: "Create a new team" }),
    ).toBeVisible();
  });

  test("a team name already used in the league is refused and the coach stays on the form", async ({
    page,
    seed,
    leagueId,
    userId,
  }) => {
    const existing = await seed.team(leagueId, userId, { state: "draft" });
    await page.goto("/team/new");

    await page.getByRole("textbox", { name: "Team name" }).fill(existing.name);
    await page.getByRole("button", { name: "Create a new team" }).click();

    await expect(
      page.getByRole("alert").filter({
        hasText: "A team with that name already exists in this league",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create a new team" }),
    ).toBeVisible();
  });
});

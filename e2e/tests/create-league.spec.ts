import { test, expect } from "../fixtures/index";
import nanoid from "~/app/utils/nanoid";

test.describe("create league", () => {
  test("creating a league lands on the home page with that league active", async ({
    page,
  }) => {
    const name = `League-${nanoid()}`;
    await page.goto("/create-league");

    await page.getByLabel("League Name").fill(name);
    await page.getByRole("button", { name: "Create League" }).click();

    await expect(
      page.getByRole("heading", { name: "Your Teams" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "User menu" }).hover();
    await expect(
      page
        .getByRole("combobox", { name: "Active league" })
        .getByRole("option", { selected: true }),
    ).toHaveText(name);
  });

  test("an empty name is refused and the coach stays on the form", async ({
    page,
  }) => {
    await page.goto("/create-league");

    await page.getByRole("button", { name: "Create League" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "League name is required" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Create New League" }),
    ).toBeVisible();
  });

  test("a name of only spaces is refused and the coach stays on the form", async ({
    page,
  }) => {
    await page.goto("/create-league");

    await page.getByLabel("League Name").fill("   ");
    await page.getByRole("button", { name: "Create League" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "League name is required" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Create New League" }),
    ).toBeVisible();
  });

  test("a name already used is refused and the coach stays on the form", async ({
    page,
    nav,
  }) => {
    const name = `League-${nanoid()}`;
    await nav.createLeague(name);
    await page.goto("/create-league");

    await page.getByLabel("League Name").fill(name);
    await page.getByRole("button", { name: "Create League" }).click();

    await expect(page.getByRole("alert")).toContainText(/already exists/i);
    await expect(
      page.getByRole("heading", { name: "Create New League" }),
    ).toBeVisible();
  });

  test("a name that differs only by case is refused too", async ({
    page,
    nav,
  }) => {
    const name = `League-${nanoid()}`;
    await nav.createLeague(name);
    await page.goto("/create-league");

    await page.getByLabel("League Name").fill(name.toUpperCase());
    await page.getByRole("button", { name: "Create League" }).click();

    await expect(page.getByRole("alert")).toContainText(/already exists/i);
    await expect(
      page.getByRole("heading", { name: "Create New League" }),
    ).toBeVisible();
  });
});

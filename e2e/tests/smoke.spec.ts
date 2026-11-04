import { test, expect } from "../fixtures/index";

test("auth fixture: can sign in and reach home page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Sign In to BBLO")).not.toBeVisible();
});

import { test as base, expect, type Page } from "@playwright/test";
import nanoid from "~/app/utils/nanoid";
import { waitForHydrationOnLoad } from "../fixtures/auth";

// These tests exercise the signed-out experience, so they deliberately do not
// use the cookie-seeding fixtures from ../fixtures.
const test = base.extend({
  page: async ({ page }, use) => {
    waitForHydrationOnLoad(page);
    await use(page);
  },
});

const PASSWORD = "testpassword1!";

function newCredentials() {
  const id = nanoid().toLowerCase();
  return {
    name: `Coach ${id}`,
    email: `auth-${id}@test.local`,
    password: PASSWORD,
  };
}

async function signUp(page: Page, creds: ReturnType<typeof newCredentials>) {
  await page.goto("/login");
  await page
    .getByRole("button", { name: "Don't have an account? Sign up" })
    .click();
  await page.getByRole("textbox", { name: "Name" }).fill(creds.name);
  await page.getByRole("textbox", { name: "Email" }).fill(creds.email);
  await page.getByLabel("Password").fill(creds.password);
  await page.getByRole("button", { name: "Sign Up with Email" }).click();
}

test.describe("signed out", () => {
  test("visiting a protected page redirects to the login page", async ({
    page,
  }) => {
    await page.goto("/schedule");
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: "Sign In to BBLO" }),
    ).toBeVisible();
  });

  test("a protected game URL does not leak any content", async ({ page }) => {
    await page.goto("/team/some-team-id");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("navigation")).toHaveCount(0);
  });

  test("login form offers sign in and a switch to sign up", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("button", { name: "Log In with Email" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue with Discord" }),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Name" })).toBeHidden();

    await page
      .getByRole("button", { name: "Don't have an account? Sign up" })
      .click();

    await expect(
      page.getByRole("heading", { name: "Create Account" }),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Name" })).toBeVisible();

    await page
      .getByRole("button", { name: "Already have an account? Log in" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Sign In to BBLO" }),
    ).toBeVisible();
  });
});

test.describe("sign up and sign in", () => {
  test("a new user can sign up and lands on the home page", async ({
    page,
  }) => {
    const creds = newCredentials();
    await signUp(page, creds);

    await expect(page).toHaveURL(/\/$/);
    // A brand-new user has no league yet, so they are prompted to make one.
    await expect(page.getByRole("alert")).toContainText(
      "You are not currently part of any leagues",
    );
    await expect(page.getByRole("button", { name: "User menu" })).toBeVisible();
  });

  test("sign up without a name is rejected", async ({ page }) => {
    const creds = newCredentials();
    await page.goto("/login");
    await page
      .getByRole("button", { name: "Don't have an account? Sign up" })
      .click();
    await page.getByRole("textbox", { name: "Email" }).fill(creds.email);
    await page.getByLabel("Password").fill(creds.password);
    await page.getByRole("button", { name: "Sign Up with Email" }).click();

    await expect(page.getByRole("alert")).toHaveText("Name is required");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("signing up with an email that already exists shows an error", async ({
    page,
    browser,
  }) => {
    const creds = newCredentials();
    await signUp(page, creds);
    await expect(page).toHaveURL(/\/$/);

    const other = await browser.newContext();
    try {
      const otherPage = await other.newPage();
      waitForHydrationOnLoad(otherPage);
      await signUp(otherPage, creds);

      await expect(otherPage.getByRole("alert")).toHaveText(
        /user already exists/i,
      );
      await expect(otherPage).toHaveURL(/\/login$/);
    } finally {
      await other.close();
    }
  });

  test("an existing user can sign out and sign back in", async ({ page }) => {
    const creds = newCredentials();
    await signUp(page, creds);
    await expect(page).toHaveURL(/\/$/);

    await page.getByRole("button", { name: "User menu" }).hover();
    await page.getByRole("button", { name: "Sign Out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    // The session is really gone, not just hidden.
    await page.goto("/schedule");
    await expect(page).toHaveURL(/\/login$/);

    await page.getByRole("textbox", { name: "Email" }).fill(creds.email);
    await page.getByLabel("Password").fill(creds.password);
    await page.getByRole("button", { name: "Log In with Email" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: "User menu" })).toBeVisible();
  });

  test("signing in with the wrong password shows an error and stays put", async ({
    page,
  }) => {
    const creds = newCredentials();
    await signUp(page, creds);
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole("button", { name: "User menu" }).hover();
    await page.getByRole("button", { name: "Sign Out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByRole("textbox", { name: "Email" }).fill(creds.email);
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Log In with Email" }).click();

    await expect(page.getByRole("alert")).toHaveText(
      "Invalid email or password",
    );
    await expect(page).toHaveURL(/\/login$/);
  });
});

import { test as base, expect } from "../fixtures/index";
import {
  TEST_PASSWORD,
  inviteMember,
  waitForHydrationOnLoad,
} from "../fixtures/auth";
import { testDb } from "../fixtures/db";
import { eq } from "drizzle-orm";
import type { Page } from "@playwright/test";
import { invitation } from "~/db/schema";
import nanoid from "~/app/utils/nanoid";

const test = base.extend<{ inviteePage: Page }>({
  inviteePage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const inviteePage = await context.newPage();
    waitForHydrationOnLoad(inviteePage);
    await use(inviteePage);
    await context.close();
  },
});

const newAddress = () => `invitee-${nanoid().toLowerCase()}@test.local`;

async function copyInviteLink(page: Page, address: string): Promise<string> {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/admin/invite-manager");
  await page.getByRole("textbox", { name: "User email" }).fill(address);
  await page.getByRole("button", { name: "Send invite" }).click();
  const row = page.getByRole("row").filter({ hasText: address });
  await row.getByRole("button", { name: "Copy link" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Invite link copied" }),
  ).toBeVisible();
  return page.evaluate(() => navigator.clipboard.readText());
}

async function signUpAt(page: Page, address: string) {
  await page
    .getByRole("button", { name: "Don't have an account? Sign up" })
    .click();
  await page.getByRole("textbox", { name: "Name" }).fill("Invitee");
  await page.getByRole("textbox", { name: "Email" }).fill(address);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign Up with Email" }).click();
}

async function signInAt(page: Page, address: string) {
  await page.getByRole("textbox", { name: "Email" }).fill(address);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Log In with Email" }).click();
}

test.describe("accept invite", () => {
  test("an invitee signs up from the invite link and joins the league", async ({
    page,
    inviteePage,
    leagueName,
    testLeague,
  }) => {
    const address = newAddress();
    const link = await copyInviteLink(page, address);

    await test.step("a signed-out visitor is sent to sign in first", async () => {
      await inviteePage.goto(link);

      await expect(
        inviteePage.getByRole("heading", { name: "Sign In to BBLO" }),
      ).toBeVisible();
    });

    await test.step("signing up returns them to the invite", async () => {
      await signUpAt(inviteePage, address);

      await expect(
        inviteePage.getByRole("heading", { name: `Join ${leagueName}` }),
      ).toBeVisible();
      await expect(
        inviteePage.getByText(`${testLeague.admin.name} has invited you`),
      ).toBeVisible();
    });

    await test.step("accepting makes the league their active league", async () => {
      await inviteePage.getByRole("button", { name: "Accept invite" }).click();

      await expect(
        inviteePage.getByRole("heading", { name: "Your Teams" }),
      ).toBeVisible();
      await expect(inviteePage.getByLabel("Active league")).toHaveText(
        leagueName,
      );
    });

    await test.step("the invite manager shows it accepted with its link disabled", async () => {
      await page.reload();

      const row = page.getByRole("row").filter({ hasText: address });
      await expect(
        row.getByRole("cell", { name: "accepted", exact: true }),
      ).toBeVisible();
      await expect(
        row.getByRole("button", { name: "Copy link" }),
      ).toBeDisabled();
    });
  });

  test("an invite for a different address is refused", async ({
    page,
    inviteePage,
  }) => {
    const link = await copyInviteLink(page, newAddress());

    await inviteePage.goto(link);
    await signUpAt(inviteePage, newAddress());

    await expect(
      inviteePage.getByRole("heading", { name: "Invite unavailable" }),
    ).toBeVisible();
    await expect(inviteePage.getByText(/not the recipient/i)).toBeVisible();
    await expect(
      inviteePage.getByRole("button", { name: "Accept invite" }),
    ).toBeHidden();
  });

  test("a revoked invite cannot be accepted", async ({ page, inviteePage }) => {
    const address = newAddress();
    const link = await copyInviteLink(page, address);
    const row = page.getByRole("row").filter({ hasText: address });
    await row.getByRole("button", { name: "Revoke" }).click();
    await expect(
      row.getByRole("cell", { name: "canceled", exact: true }),
    ).toBeVisible();

    await inviteePage.goto(link);
    await signUpAt(inviteePage, address);

    await expect(
      inviteePage.getByRole("heading", { name: "Invite unavailable" }),
    ).toBeVisible();
    await expect(inviteePage.getByText(/not found/i)).toBeVisible();
  });

  test("an expired invite cannot be accepted", async ({
    page,
    otherLeague,
    testLeague,
  }) => {
    const inviteId = await inviteMember(otherLeague, testLeague.admin.email);
    await testDb
      .update(invitation)
      .set({ expiresAt: new Date(0) })
      .where(eq(invitation.id, inviteId));

    await page.goto(`/accept-invite?id=${inviteId}`);
    await expect(
      page.getByRole("heading", { name: "Invite unavailable" }),
    ).toBeVisible();
    await expect(page.getByText(/not found/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Accept invite" }),
    ).toBeHidden();
  });

  test("an existing user signs in from the invite link and joins the league", async ({
    page,
    inviteePage,
    otherLeague,
    testLeague,
    leagueName,
  }) => {
    const link = await copyInviteLink(page, otherLeague.admin.email);

    await inviteePage.goto(link);
    await signInAt(inviteePage, otherLeague.admin.email);

    await expect(
      inviteePage.getByRole("heading", { name: `Join ${leagueName}` }),
    ).toBeVisible();
    await inviteePage.getByRole("button", { name: "Accept invite" }).click();

    await expect(
      inviteePage.getByRole("heading", { name: "Your Teams" }),
    ).toBeVisible();
    await expect(inviteePage.getByLabel("Active league")).toHaveValue(
      testLeague.leagueId,
    );
  });

  test("a signed-in user opens the invite link directly and joins the league", async ({
    page,
    otherLeague,
    testLeague,
  }) => {
    const inviteId = await inviteMember(otherLeague, testLeague.admin.email);

    await page.goto(`/accept-invite?id=${inviteId}`);
    await expect(
      page.getByRole("heading", { name: `Join ${otherLeague.leagueName}` }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Accept invite" }).click();

    await expect(
      page.getByRole("heading", { name: "Your Teams" }),
    ).toBeVisible();
    await expect(page.getByLabel("Active league")).toHaveValue(
      otherLeague.leagueId,
    );
  });

  test("a redirectTo that leaves the site is ignored after signing in", async ({
    inviteePage,
    otherLeague,
  }) => {
    await inviteePage.goto("/login?redirectTo=//evil.com");
    await signInAt(inviteePage, otherLeague.admin.email);

    await expect(
      inviteePage.getByRole("heading", { name: "Your Teams" }),
    ).toBeVisible();
    await expect(inviteePage).toHaveURL("/");
  });

  test("a redirectTo that leaves the site is ignored after signing up", async ({
    inviteePage,
  }) => {
    await inviteePage.goto("/login?redirectTo=//evil.com");
    await signUpAt(inviteePage, newAddress());

    await expect(
      inviteePage.getByRole("alert").filter({ hasText: "not currently part" }),
    ).toBeVisible();
    await expect(inviteePage).toHaveURL("/");
  });

  test("a link with no invite ID says so", async ({ page }) => {
    await page.goto("/accept-invite");

    await expect(
      page.getByRole("heading", { name: "Invite unavailable" }),
    ).toBeVisible();
    await expect(
      page.getByText("This invite link has no invite ID."),
    ).toBeVisible();
  });
});

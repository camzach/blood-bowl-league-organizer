import { test, expect } from "../fixtures/index";
import { inviteMember } from "../fixtures/auth";
import { testDb } from "../fixtures/db";
import { eq } from "drizzle-orm";
import { invitation } from "~/db/schema";
import nanoid from "~/app/utils/nanoid";

const newAddress = () => `invitee-${nanoid().toLowerCase()}@test.local`;

test.describe("invite manager", () => {
  test("sending an invite lists it as pending for that address", async ({
    page,
  }) => {
    const address = newAddress();
    await page.goto("/admin/invite-manager");
    await expect(page.getByText("No active invite codes.")).toBeVisible();

    await page.getByRole("textbox", { name: "User email" }).fill(address);
    await page.getByRole("button", { name: "Send invite" }).click();

    const row = page.getByRole("row").filter({ hasText: address });
    await expect(
      row.getByRole("cell", { name: "pending", exact: true }),
    ).toBeVisible();
  });

  test("inviting an address that already has a pending invite is refused", async ({
    page,
  }) => {
    const address = newAddress();
    await page.goto("/admin/invite-manager");
    await page.getByRole("textbox", { name: "User email" }).fill(address);
    await page.getByRole("button", { name: "Send invite" }).click();
    const rows = page.getByRole("row").filter({ hasText: address });
    await expect(rows).toHaveCount(1);

    await page.getByRole("textbox", { name: "User email" }).fill(address);
    await page.getByRole("button", { name: "Send invite" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "already invited" }),
    ).toBeVisible();
    await expect(rows).toHaveCount(1);
  });

  test("an address that differs only by case counts as the same invite", async ({
    page,
  }) => {
    const address = newAddress();
    await page.goto("/admin/invite-manager");
    await page.getByRole("textbox", { name: "User email" }).fill(address);
    await page.getByRole("button", { name: "Send invite" }).click();
    await expect(
      page.getByRole("row").filter({ hasText: address }),
    ).toHaveCount(1);

    await page
      .getByRole("textbox", { name: "User email" })
      .fill(address.toUpperCase());
    await page.getByRole("button", { name: "Send invite" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "already invited" }),
    ).toBeVisible();
  });

  test("something that is not an email address is refused before it is sent", async ({
    page,
  }) => {
    await page.goto("/admin/invite-manager");

    await page
      .getByRole("textbox", { name: "User email" })
      .fill("not-an-email");
    await page.getByRole("button", { name: "Send invite" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "Enter a valid email" }),
    ).toBeVisible();
    await expect(page.getByText("No active invite codes.")).toBeVisible();
  });

  test("inviting someone who is already in the league is refused", async ({
    page,
    memberEmail,
  }) => {
    await page.goto("/admin/invite-manager");

    await page.getByRole("textbox", { name: "User email" }).fill(memberEmail);
    await page.getByRole("button", { name: "Send invite" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "already a member" }),
    ).toBeVisible();
    const rows = page.getByRole("row").filter({ hasText: memberEmail });
    await expect(rows).toHaveCount(1);
    await expect(
      rows.getByRole("cell", { name: "accepted", exact: true }),
    ).toBeVisible();
  });

  test("a revoked invite is marked canceled and the address can be invited again", async ({
    page,
  }) => {
    const address = newAddress();
    await page.goto("/admin/invite-manager");
    await page.getByRole("textbox", { name: "User email" }).fill(address);
    await page.getByRole("button", { name: "Send invite" }).click();
    const rows = page.getByRole("row").filter({ hasText: address });
    await expect(
      rows.getByRole("cell", { name: "pending", exact: true }),
    ).toBeVisible();

    await test.step("revoking marks the invite canceled", async () => {
      await rows.getByRole("button", { name: "Revoke" }).click();

      await expect(
        rows.getByRole("cell", { name: "canceled", exact: true }),
      ).toBeVisible();
    });

    await test.step("inviting the same address again adds a new pending invite", async () => {
      await page.getByRole("textbox", { name: "User email" }).fill(address);
      await page.getByRole("button", { name: "Send invite" }).click();

      await expect(rows).toHaveCount(2);
      await expect(
        rows.getByRole("cell", { name: "pending", exact: true }),
      ).toBeVisible();
      await expect(
        rows.getByRole("cell", { name: "canceled", exact: true }),
      ).toBeVisible();
    });
  });

  test("each league lists only its own invites", async ({ page, nav }) => {
    const address = newAddress();
    await page.goto("/admin/invite-manager");
    await page.getByRole("textbox", { name: "User email" }).fill(address);
    await page.getByRole("button", { name: "Send invite" }).click();
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: address })
        .getByRole("cell", { name: "pending", exact: true }),
    ).toBeVisible();

    await nav.createLeague(`League-${nanoid()}`);
    await page.goto("/admin/invite-manager");

    await expect(page.getByText("No active invite codes.")).toBeVisible();
  });

  test("only a pending invite can have its link copied", async ({
    page,
    memberEmail,
  }) => {
    const address = newAddress();
    await page.goto("/admin/invite-manager");
    await page.getByRole("textbox", { name: "User email" }).fill(address);
    await page.getByRole("button", { name: "Send invite" }).click();

    await expect(
      page
        .getByRole("row")
        .filter({ hasText: address })
        .getByRole("button", { name: "Copy link" }),
    ).toBeEnabled();
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: memberEmail })
        .getByRole("button", { name: "Copy link" }),
    ).toBeDisabled();
  });

  test("an expired invite can no longer have its link copied", async ({
    page,
    testLeague,
  }) => {
    const address = newAddress();
    const inviteId = await inviteMember(testLeague, address);
    await testDb
      .update(invitation)
      .set({ expiresAt: new Date(0) })
      .where(eq(invitation.id, inviteId));

    await page.goto("/admin/invite-manager");

    const row = page.getByRole("row").filter({ hasText: address });
    await expect(
      row.getByRole("cell", { name: "pending", exact: true }),
    ).toBeVisible();
    await expect(row.getByRole("button", { name: "Revoke" })).toBeVisible();
    await expect(row.getByRole("button", { name: "Copy link" })).toBeDisabled();
  });
});

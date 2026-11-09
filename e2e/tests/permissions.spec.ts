import { test, expect } from "../fixtures/index";

const ADMIN_PAGES = [
  { path: "/admin/schedule-manager", heading: "Season Management" },
  { path: "/admin/invite-manager", heading: "Manage Invites" },
  { path: "/admin/discord-guild-linker", heading: "Discord Integration" },
];

test.describe("as a plain member", () => {
  test.use({ role: "member" });

  test("the navigation offers only the non-admin menus", async ({ page }) => {
    await expect(page.getByRole("navigation").getByRole("button")).toHaveText([
      "Codex",
      "Teams",
    ]);
  });

  for (const { path } of ADMIN_PAGES) {
    test(`${path} sends them back to the home page`, async ({ page }) => {
      await page.goto(path);

      await expect(page).toHaveURL("/");
    });
  }

  test("a team they coach has an Edit button", async ({
    page,
    seed,
    leagueId,
    userId,
  }) => {
    const team = await seed.team(leagueId, userId, { state: "hiring" });

    await page.goto(`/team/${team.teamId}`);

    await expect(page.getByRole("link", { name: "Edit" })).toBeVisible();
  });

  test("a team they do not coach has no Edit button", async ({
    page,
    seed,
    leagueId,
    adminUserId,
  }) => {
    const team = await seed.team(leagueId, adminUserId, { state: "hiring" });

    await page.goto(`/team/${team.teamId}`);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(team.name);

    await expect(page.getByRole("link", { name: "Edit" })).toBeHidden();
  });

  test("they cannot open the edit page of a team they do not coach", async ({
    page,
    seed,
    leagueId,
    adminUserId,
  }) => {
    const team = await seed.team(leagueId, adminUserId, { state: "hiring" });

    await page.goto(`/team/${team.teamId}/edit`);

    await expect(page).toHaveURL("/");
  });

  test("they can edit a team they coach", async ({
    page,
    nav,
    seed,
    leagueId,
    userId,
  }) => {
    const team = await seed.team(leagueId, userId, { state: "hiring" });
    await page.reload();

    await nav.goToTeamEdit(team.name);

    await expect(
      page.getByRole("list", { name: "Team setup steps" }),
    ).toBeVisible();
  });
});

test.describe("as the league admin", () => {
  test("the navigation also offers the admin menu", async ({ page }) => {
    await expect(page.getByRole("navigation").getByRole("button")).toHaveText([
      "Codex",
      "Teams",
      "Admin",
    ]);
  });

  for (const { path, heading } of ADMIN_PAGES) {
    test(`${path} shows the ${heading} page`, async ({ page }) => {
      await page.goto(path);

      await expect(
        page.getByRole("heading", { name: heading, level: 1 }),
      ).toBeVisible();
    });
  }

  test("the admin menu leads to the schedule manager", async ({
    page,
    nav,
  }) => {
    await nav.goToScheduleManager();

    await expect(
      page.getByRole("heading", { name: "Season Management", level: 1 }),
    ).toBeVisible();
  });
});

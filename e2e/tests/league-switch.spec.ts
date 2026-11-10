import nanoid from "~/app/utils/nanoid";
import { test, expect } from "../fixtures/index";

test("league-switch: switching active league shows that league's teams", async ({
  page,
  nav,
  seed,
  leagueId,
  leagueName,
  userId,
}) => {
  const team = await seed.team(leagueId, userId);

  const league2Name = `lague2-${nanoid()}`;
  const league2 = await nav.createLeague(league2Name);
  const team2 = await seed.team(league2.leagueId, userId);

  await page.reload();
  await expect(page.getByRole("link", { name: team2.name })).toBeVisible();
  await expect(page.getByRole("link", { name: team.name })).toBeHidden();

  await page.getByRole("button", { name: "User menu" }).hover();
  await page
    .getByRole("combobox", { name: "Active league" })
    .selectOption({ label: leagueName });

  await expect(page.getByRole("link", { name: team.name })).toBeVisible();
  await expect(page.getByRole("link", { name: team2.name })).toBeHidden();
});

test.describe("as a member of one league and the admin of another", () => {
  test.use({ role: "member" });

  test("the Admin menu follows the league that is active", async ({
    page,
    nav,
    leagueName,
  }) => {
    const ownLeagueName = `own-${nanoid()}`;
    const navButtons = page.getByRole("navigation").getByRole("button");

    await test.step("the creator of a league sees the Admin menu there", async () => {
      await nav.createLeague(ownLeagueName);
      await page.reload();
      await expect(navButtons).toHaveText(["Codex", "Teams", "Admin"]);
    });

    await test.step("switching to the league they only belong to hides it", async () => {
      await page.getByRole("button", { name: "User menu" }).hover();
      await page
        .getByRole("combobox", { name: "Active league" })
        .selectOption({ label: leagueName });
      await expect(navButtons).toHaveText(["Codex", "Teams"]);
    });

    await test.step("switching back shows it again", async () => {
      await page.getByRole("button", { name: "User menu" }).hover();
      await page
        .getByRole("combobox", { name: "Active league" })
        .selectOption({ label: ownLeagueName });
      await expect(navButtons).toHaveText(["Codex", "Teams", "Admin"]);
    });
  });

  test("the league switcher lists every league with the active one selected", async ({
    page,
    nav,
    leagueName,
  }) => {
    const ownLeagueName = `own-${nanoid()}`;
    await nav.createLeague(ownLeagueName);
    await page.reload();
    await page.getByRole("button", { name: "User menu" }).hover();
    const switcher = page.getByRole("combobox", { name: "Active league" });

    await expect(switcher.getByRole("option")).toHaveCount(2);
    await expect(
      switcher.getByRole("option", { name: leagueName, exact: true }),
    ).toBeAttached();
    await expect(
      switcher.getByRole("option", { name: ownLeagueName, exact: true }),
    ).toBeAttached();
    await expect(switcher.getByRole("option", { selected: true })).toHaveText(
      ownLeagueName,
    );
  });
});

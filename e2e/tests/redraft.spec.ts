import { test, expect } from "../fixtures/index";

test("redraft: a coach with no team can pick a draft team and continue editing it", async ({
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
  await page.getByRole("button", { name: "Redraft an existing team" }).click();

  await expect(
    page.getByRole("heading", { name: team.name, level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Team setup steps" }),
  ).toBeVisible();
  await expect(page.getByText(other.name)).toBeHidden();
});

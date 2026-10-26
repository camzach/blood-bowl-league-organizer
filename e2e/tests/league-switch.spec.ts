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

  await page.getByRole("button", { name: "User menu" }).click();
  await page.getByText(league2Name, { exact: true }).hover();
  await page.getByRole("button", { name: leagueName }).click();

  await expect(page.getByRole("link", { name: team.name })).toBeVisible();
  await expect(page.getByRole("link", { name: team2.name })).toBeHidden();
});

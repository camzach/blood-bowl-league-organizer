import { test, expect } from "../fixtures/index";

test("hire-fire: hired player appears on roster then can be fired", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  const team = await seed.team(leagueId, userId, {
    state: "hiring",
    playerCount: 11,
  });
  await page.reload();
  await nav.goToTeamEdit(team.name);

  // Hire a new player as #12
  await page
    .getByRole("combobox", { name: "Player number" })
    .selectOption("12");
  await page.getByRole("button", { name: "HIRE!!!" }).click();

  // #12 row now exists
  const hiredRow = page
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name: "12", exact: true }) });
  await expect(hiredRow).toBeVisible();

  // Advance to firing phase
  await page.getByRole("button", { name: "Done hiring players" }).click();

  // #12 row is still there, and now has a Fire! button
  await expect(hiredRow.getByRole("button", { name: "Fire!" })).toBeVisible();

  // Fire the player we just hired
  await hiredRow.getByRole("button", { name: "Fire!" }).click();

  // #12 is gone
  await expect(hiredRow).not.toBeAttached();
});

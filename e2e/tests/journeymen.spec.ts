import { test, expect } from "../fixtures/index";

test("journeymen: selecting journeymen moves game to inducements", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  // Home team needs 2 journeymen; away is full
  const teamA = await seed.team(leagueId, userId, {
    state: "playing",
    playerCount: 9,
  });
  const teamB = await seed.team(leagueId, userId, {
    state: "playing",
    playerCount: 11,
  });
  const season = await seed.season(leagueId, { isActive: true });
  await seed.game(leagueId, teamA.teamId, teamB.teamId, {
    seasonId: season.seasonId,
    state: "journeymen",
  });

  await nav.goToGame(teamA.name, teamB.name);

  // Only the home team needs journeymen — scope to their group and pick the first position
  await page
    .getByRole("group", { name: new RegExp(teamA.name) })
    .getByRole("radio")
    .first()
    .check();

  await page.getByRole("button", { name: "Submit!" }).click();

  // Page reloads into inducements state
  await expect(page.getByRole("button", { name: "Done :)" })).toBeVisible();
});

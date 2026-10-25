import { test, expect } from "../fixtures/index";

test("inducements: skipping inducements moves game to in_progress", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  await seed.makeAdmin(userId);

  const teamA = await seed.team(leagueId, userId, { state: "playing" });
  const teamB = await seed.team(leagueId, userId, { state: "playing" });
  const season = await seed.season(leagueId, { isActive: true });
  await seed.game(teamA.teamId, teamB.teamId, {
    seasonId: season.seasonId,
    state: "inducements",
  });

  await page.goto("/");
  await nav.goToGame(teamA.name, teamB.name);

  await page.getByRole("button", { name: "Done :)" }).click();

  // Page reloads into in_progress state — the end-game submit button confirms it
  await expect(
    page.getByRole("button", { name: "Done — end game" }),
  ).toBeVisible();
});

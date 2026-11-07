import { test, expect } from "../fixtures/index";

test("end-game: completing a game moves both teams to improving", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  const teamA = await seed.team(leagueId, userId, { state: "ready" });
  const teamB = await seed.team(leagueId, userId, { state: "ready" });
  const season = await seed.season(leagueId, { isActive: true });
  await seed.game(teamA.teamId, teamB.teamId, {
    seasonId: season.seasonId,
    state: "in_progress",
  });

  await nav.goToGame(teamA.name, teamB.name);

  await page.getByRole("button", { name: "Done" }).click();
  const mvpModal = page.getByRole("dialog", {
    name: "MVP Nomination",
  });
  const homeGroup = mvpModal.getByRole("group", { name: teamA.name });
  const awayGroup = mvpModal.getByRole("group", { name: teamB.name });
  for (let i = 1; i <= 6; i++) {
    await homeGroup
      .getByRole("checkbox", { name: `#${i}`, exact: true })
      .check();
    await awayGroup
      .getByRole("checkbox", { name: `#${i}`, exact: true })
      .check();
  }
  await mvpModal.getByRole("button", { name: "Submit Nominations" }).click();

  const resultsModal = page.getByRole("dialog", {
    name: "Post-Game Sequence",
  });
  await expect(resultsModal).toBeVisible();

  await resultsModal.getByRole("button", { name: "Close" }).click();
  await page.reload();
  await expect(page.getByRole("cell", { name: "Score" })).toBeVisible();
});

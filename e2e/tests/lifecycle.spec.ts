import { test, expect } from "../fixtures/index";

/**
 * Full lifecycle: plays a game for two ready teams, then walks the home team
 *   ready → (game) → improving → hiring → firing → ready
 *
 * Seed treasury=0 to avoid the "Expensive Mistakes" warning modal.
 * Seed one player with 3 otherSPP so "Spend SPP" is enabled during improving.
 * Use 12 players so firing one still leaves 11 eligible.
 */
test("lifecycle: full post-game flow from game start to ready", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  const team1 = await seed.team(leagueId, userId, {
    state: "ready",
    playerCount: 12,
    firstPlayerSPP: 3,
    treasury: 0,
  });
  const team2 = await seed.team(leagueId, userId, {
    state: "ready",
    playerCount: 11,
    treasury: 0,
  });
  const season = await seed.season(leagueId, { isActive: true });
  await seed.game(leagueId, team1.teamId, team2.teamId, {
    seasonId: season.seasonId,
  });

  const playerRow = (number: number) =>
    page.getByRole("row").filter({
      has: page.getByRole("cell", { name: String(number), exact: true }),
    });

  await test.step("play the game", async () => {
    await nav.goToGame(team1.name, team2.name);
    await page.getByRole("button", { name: "Play" }).click();
    await page.getByRole("link", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Done :)" }).click();
    await expect(
      page.getByRole("button", { name: "Done — end game" }),
    ).toBeVisible();
  });

  await test.step("nominate MVPs", async () => {
    await page.getByRole("button", { name: "Done — end game" }).click();
    const mvpModal = page.getByRole("dialog", { name: "MVP Nomination" });
    const homeGroup = mvpModal.getByRole("group", { name: team1.name });
    const awayGroup = mvpModal.getByRole("group", { name: team2.name });
    for (let i = 1; i <= 6; i++) {
      await homeGroup
        .getByRole("checkbox", { name: `#${i}`, exact: true })
        .check();
      await awayGroup
        .getByRole("checkbox", { name: `#${i}`, exact: true })
        .check();
    }
    await mvpModal.getByRole("button", { name: "Submit Nominations" }).click();
    await expect(
      page.getByRole("dialog", { name: "Post-Game Sequence" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
  });

  await test.step("improve players", async () => {
    await nav.goToTeamEdit(team1.name);
    await expect(
      playerRow(1).getByRole("button", { name: "Spend SPP" }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Done improving players" }).click();
    await expect(
      page.getByRole("button", { name: "Done hiring players" }),
    ).toBeVisible();
  });

  await test.step("hire players", async () => {
    await page.getByRole("button", { name: "Done hiring players" }).click();
    await expect(
      page.getByRole("button", { name: "Ready for next game" }),
    ).toBeVisible();
  });

  await test.step("fire a player, leaving the 11 required", async () => {
    await playerRow(12).getByRole("button", { name: "Fire!" }).click();
    await expect(playerRow(12)).not.toBeAttached();
    await expect(
      playerRow(11).getByRole("button", { name: "Fire!" }),
    ).toBeDisabled();
  });

  await test.step("ready for the next game", async () => {
    await page.getByRole("button", { name: "Ready for next game" }).click();
    await expect(
      page.getByRole("heading", { name: team1.name, level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Team setup steps" }),
    ).toBeHidden();
    await expect(page.getByRole("link", { name: "Edit" })).toBeHidden();
  });
});

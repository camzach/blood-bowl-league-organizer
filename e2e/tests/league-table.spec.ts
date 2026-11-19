import { test, expect } from "../fixtures/index";

test("league table: each team's results are in the right columns, best team first", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  const loser = await seed.team(leagueId, userId, { state: "ready" });
  const winner = await seed.team(leagueId, userId, { state: "ready" });
  const season = await seed.season(leagueId, { isActive: true });
  await seed.game(leagueId, loser.teamId, winner.teamId, {
    seasonId: season.seasonId,
    state: "complete",
    homeTouchdowns: 1,
    awayTouchdowns: 3,
    homeCasualties: 2,
    awayCasualties: 6,
  });

  await nav.goToLeagueTable();

  const rows = page.getByRole("row").filter({
    has: page.getByRole("cell"),
  });

  await test.step("the columns are in the expected order", async () => {
    await expect(page.getByRole("columnheader")).toHaveText([
      "Team",
      "League Points",
      "Wins",
      "Losses",
      "Draws",
      "Touchdowns",
      "TD Difference",
      "Casualties",
      "Cas Difference",
    ]);
  });

  await test.step("the winner is listed first", async () => {
    await expect(rows.nth(0).getByRole("cell")).toHaveText([
      winner.name,
      "5",
      "1",
      "0",
      "0",
      "3",
      "2",
      "6",
      "4",
    ]);
  });

  await test.step("the loser is listed second", async () => {
    await expect(rows.nth(1).getByRole("cell")).toHaveText([
      loser.name,
      "0",
      "0",
      "1",
      "0",
      "1",
      "-2",
      "2",
      "-4",
    ]);
    await expect(rows).toHaveCount(2);
  });
});

test("league table: games from a season that is not active are not counted", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  const alpha = await seed.team(leagueId, userId, { state: "ready" });
  const bravo = await seed.team(leagueId, userId, { state: "ready" });
  const retired = await seed.team(leagueId, userId, { state: "ready" });
  const oldSeason = await seed.season(leagueId, { isActive: false });
  const season = await seed.season(leagueId, { isActive: true });
  await seed.game(leagueId, bravo.teamId, alpha.teamId, {
    seasonId: oldSeason.seasonId,
    state: "complete",
    homeTouchdowns: 5,
    awayTouchdowns: 0,
  });
  await seed.game(leagueId, bravo.teamId, retired.teamId, {
    seasonId: oldSeason.seasonId,
    state: "complete",
    homeTouchdowns: 2,
    awayTouchdowns: 1,
  });
  await seed.game(leagueId, alpha.teamId, bravo.teamId, {
    seasonId: season.seasonId,
    state: "complete",
    homeTouchdowns: 2,
    awayTouchdowns: 1,
  });

  await nav.goToLeagueTable();

  const headers = await page.getByRole("columnheader").allTextContents();
  expect(headers).toContain("League Points");
  expect(headers).toContain("Wins");
  const pointsColumn = headers.indexOf("League Points");
  const winsColumn = headers.indexOf("Wins");
  const rows = page.getByRole("row").filter({
    has: page.getByRole("cell"),
  });

  await expect(rows).toHaveCount(2);
  const alphaCells = rows.filter({ hasText: alpha.name }).getByRole("cell");
  await expect(alphaCells.nth(pointsColumn)).toHaveText("3");
  await expect(alphaCells.nth(winsColumn)).toHaveText("1");
  const bravoCells = rows.filter({ hasText: bravo.name }).getByRole("cell");
  await expect(bravoCells.nth(pointsColumn)).toHaveText("0");
  await expect(bravoCells.nth(winsColumn)).toHaveText("0");
  await expect(rows.filter({ hasText: retired.name })).toHaveCount(0);
});

test("league table: another league's teams are not listed", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
  otherLeague,
}) => {
  const home = await seed.team(leagueId, userId, { state: "ready" });
  const away = await seed.team(leagueId, userId, { state: "ready" });
  const season = await seed.season(leagueId, { isActive: true });
  await seed.game(leagueId, home.teamId, away.teamId, {
    seasonId: season.seasonId,
    state: "complete",
    homeTouchdowns: 1,
  });
  const otherHome = await seed.team(
    otherLeague.leagueId,
    otherLeague.admin.userId,
    { state: "ready" },
  );
  const otherAway = await seed.team(
    otherLeague.leagueId,
    otherLeague.admin.userId,
    { state: "ready" },
  );
  const otherSeason = await seed.season(otherLeague.leagueId, {
    isActive: true,
  });
  await seed.game(otherLeague.leagueId, otherHome.teamId, otherAway.teamId, {
    seasonId: otherSeason.seasonId,
    state: "complete",
    homeTouchdowns: 1,
  });

  await nav.goToLeagueTable();

  const rows = page.getByRole("row").filter({
    has: page.getByRole("cell"),
  });
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: home.name })).toHaveCount(1);
  await expect(rows.filter({ hasText: away.name })).toHaveCount(1);
  await expect(rows.filter({ hasText: otherHome.name })).toHaveCount(0);
  await expect(rows.filter({ hasText: otherAway.name })).toHaveCount(0);
});

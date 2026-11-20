import { test, expect } from "../fixtures/index";
import { playerRow } from "../fixtures/locators";

const HUMAN_ROSTER = "Human";
const HUMAN_LINEMAN = "j2q7O4qxrIdpE2N";
const HUMAN_OGRE = "rT6Ga8I2Pr5Lziw";

test("player edit: a name is kept, and a number moves or swaps with its owner", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  const team = await seed.team(leagueId, userId, {
    state: "draft",
    playerCount: 4,
  });
  await page.reload();
  await nav.goToTeamEdit(team.name);

  await test.step("a name typed into the table is saved", async () => {
    const alice = playerRow(page, 2).getByRole("textbox");
    await alice.fill("Alice");
    await alice.blur();

    const bob = playerRow(page, 4).getByRole("textbox");
    await bob.fill("Bob");
    await bob.blur();

    await expect(page.getByText("updating")).toHaveCount(0);

    await page.reload();
    await expect(playerRow(page, 2).getByRole("textbox")).toHaveValue("Alice");
    await expect(playerRow(page, 4).getByRole("textbox")).toHaveValue("Bob");
  });

  await test.step("moving to an unused number leaves the old number empty", async () => {
    await playerRow(page, 2).getByRole("combobox").selectOption("12");

    await expect(playerRow(page, 12).getByRole("textbox")).toHaveValue("Alice");
    await expect(playerRow(page, 2)).toBeHidden();
  });

  await test.step("moving to a number in use swaps the two players", async () => {
    await playerRow(page, 12).getByRole("combobox").selectOption("4");

    await expect(playerRow(page, 4).getByRole("textbox")).toHaveValue("Alice");
    await expect(playerRow(page, 12).getByRole("textbox")).toHaveValue("Bob");
    await expect(playerRow(page, 1).getByRole("textbox")).toHaveValue("");
    await expect(playerRow(page, 12)).toBeVisible();
    await expect(playerRow(page, 2)).toBeHidden();
  });
});

test("player edit: during the draft the captaincy can move to another player", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  const team = await seed.team(leagueId, userId, {
    state: "draft",
    rosterName: HUMAN_ROSTER,
    positionIds: [HUMAN_LINEMAN, HUMAN_LINEMAN, HUMAN_LINEMAN],
  });
  await page.reload();
  await nav.goToTeamEdit(team.name);

  await test.step("everyone can be made captain to begin with", async () => {
    await expect(
      page.getByRole("button", { name: "Make Captain" }),
    ).toHaveCount(3);
    await expect(
      page.getByRole("button", { name: "Make Captain" }).first(),
    ).toBeEnabled();
  });

  await test.step("the new captain's own button is disabled", async () => {
    await playerRow(page, 1)
      .getByRole("button", { name: "Make Captain" })
      .click();

    await expect(
      playerRow(page, 1).getByRole("button", { name: "Make Captain" }),
    ).toBeDisabled();
    await expect(
      playerRow(page, 2).getByRole("button", { name: "Make Captain" }),
    ).toBeEnabled();
  });

  await test.step("choosing someone else moves the captaincy", async () => {
    await playerRow(page, 2)
      .getByRole("button", { name: "Make Captain" })
      .click();

    await expect(
      playerRow(page, 2).getByRole("button", { name: "Make Captain" }),
    ).toBeDisabled();
    await expect(
      playerRow(page, 1).getByRole("button", { name: "Make Captain" }),
    ).toBeEnabled();
  });

  await test.step("the team page marks that one player as the captain", async () => {
    await nav.goToTeam(team.name);

    await expect(playerRow(page, 2).getByText("(C)")).toBeVisible();
    await expect(page.getByText("(C)")).toHaveCount(1);
  });
});

test("player edit: once the draft is over a team keeps the captain it picks", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  const team = await seed.team(leagueId, userId, {
    state: "hiring",
    rosterName: HUMAN_ROSTER,
    positionIds: [HUMAN_LINEMAN, HUMAN_LINEMAN, HUMAN_LINEMAN],
  });
  await page.reload();
  await nav.goToTeamEdit(team.name);
  await expect(page.getByRole("button", { name: "Make Captain" })).toHaveCount(
    3,
  );

  await playerRow(page, 1)
    .getByRole("button", { name: "Make Captain" })
    .click();

  await expect(page.getByRole("button", { name: "Make Captain" })).toHaveCount(
    0,
  );
  await nav.goToTeam(team.name);
  await expect(playerRow(page, 1).getByText("(C)")).toBeVisible();
});

test("player edit: a Big Guy cannot be captain", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  const team = await seed.team(leagueId, userId, {
    state: "draft",
    rosterName: HUMAN_ROSTER,
    positionIds: [HUMAN_OGRE, HUMAN_LINEMAN],
  });
  await page.reload();
  await nav.goToTeamEdit(team.name);

  await playerRow(page, 1)
    .getByRole("button", { name: "Make Captain" })
    .click();

  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "A Big Guy cannot be a captain." }),
  ).toBeVisible();
  await expect(
    playerRow(page, 1).getByRole("button", { name: "Make Captain" }),
  ).toBeEnabled();
});

test("player edit: a roster without a Team Captain rule has no captain button", async ({
  page,
  nav,
  seed,
  leagueId,
  userId,
}) => {
  const team = await seed.team(leagueId, userId, {
    state: "draft",
    playerCount: 3,
  });
  await page.reload();
  await nav.goToTeamEdit(team.name);

  await expect(playerRow(page, 1).getByRole("combobox")).toBeVisible();
  await expect(page.getByRole("button", { name: "Make Captain" })).toHaveCount(
    0,
  );
});

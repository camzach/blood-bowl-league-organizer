import { test, expect } from "../fixtures/index";

test.describe("expensive mistakes", () => {
  test("a treasury under 100000 is readied with no warning and nothing lost", async ({
    page,
    nav,
    seed,
    leagueId,
    userId,
  }) => {
    const team = await seed.team(leagueId, userId, {
      state: "firing",
      treasury: 90_000,
    });
    await page.reload();
    await nav.goToTeamEdit(team.name);

    await page.getByRole("button", { name: "Ready for next game" }).click();

    await expect(
      page.getByRole("heading", { name: team.name, level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("Treasury -- 90000")).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Team setup steps" }),
    ).toBeHidden();
  });

  test("continuing anyway shows the result and takes that much from the treasury", async ({
    page,
    nav,
    seed,
    leagueId,
    userId,
  }) => {
    const team = await seed.team(leagueId, userId, {
      state: "firing",
      treasury: 250_000,
    });
    await page.reload();
    await nav.goToTeamEdit(team.name);

    await page.getByRole("button", { name: "Ready for next game" }).click();
    await page
      .getByRole("dialog", { name: "Expensive Mistakes Warning" })
      .getByRole("button", { name: "Continue Anyways" })
      .click();

    const result = page.getByRole("dialog", {
      name: "Expensive Mistakes Result",
    });
    const outcome = result.getByText(/Lost \d+ gold!/);

    await test.step("the result names the mistake and the roll", async () => {
      await expect(outcome).toContainText(
        /(Minor Incident|Crisis Averted) - Lost (\d+) gold/,
      );
      await expect(result.getByLabel(/Die showing a [1-6]/)).toBeVisible();
    });

    const [_, cost] =
      /Lost (\d+) gold/.exec((await outcome.textContent()) ?? "") ?? [];
    const lost = Number(cost);
    expect([0, 10_000, 20_000, 30_000]).toContain(lost);

    await test.step("dismissing the result lands on the readied team minus the loss", async () => {
      await result.getByRole("button", { name: "OK" }).click();

      await expect(
        page.getByRole("heading", { name: team.name, level: 1 }),
      ).toBeVisible();
      await expect(
        page.getByText(`Treasury -- ${250_000 - lost}`),
      ).toBeVisible();
      await expect(
        page.getByRole("list", { name: "Team setup steps" }),
      ).toBeHidden();
    });
  });
});

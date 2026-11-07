import { test as authTest, type AuthFixtures } from "./auth";
import { seedTeam, seedGame, seedSeason } from "./seed";
import { buildNav, type NavFixture } from "./nav";

export type Fixtures = AuthFixtures & {
  nav: NavFixture;
  seed: {
    team: typeof seedTeam;
    game: typeof seedGame;
    season: typeof seedSeason;
  };
};

export const test = authTest.extend<Pick<Fixtures, "nav" | "seed">>({
  nav: async ({ page }, use) => {
    await buildNav(page, use);
  },

  seed: async ({}, use) => {
    await use({
      team: seedTeam,
      game: seedGame,
      season: seedSeason,
    });
  },
});

export { expect } from "@playwright/test";

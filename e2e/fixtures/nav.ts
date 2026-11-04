import { expect, type Page } from "@playwright/test";

export type NavFixture = {
  goToTeam(teamName: string): Promise<void>;
  goToTeamEdit(teamName: string): Promise<void>;
  goToSchedule(): Promise<void>;
  goToScheduleManager(): Promise<void>;
  /** Navigate to a game row by home team name. Pass the button name you expect
   *  to be visible on arrival — this confirms both navigation and game state. */
  goToGame(
    homeTeamName: string,
    awayTeamName: string,
    expectedButton?: string,
  ): Promise<void>;
  createLeague(leagueName: string): Promise<{ leagueId: string }>;
};

export async function buildNav(
  page: Page,
  use: (nav: NavFixture) => Promise<void>,
) {
  const navBar = page.getByRole("navigation");

  await use({
    async goToTeam(teamName) {
      await navBar.getByRole("button", { name: "Teams" }).click();
      await page.getByRole("link", { name: teamName, exact: true }).click();
      await expect(
        page.getByRole("heading", { name: teamName, level: 1 }),
      ).toBeVisible();
    },

    async goToTeamEdit(teamName) {
      await navBar.getByRole("button", { name: "Teams" }).click();
      await navBar.getByRole("link", { name: teamName, exact: true }).click();
      // The Edit link only appears on the team view page — clicking it confirms
      // we've landed there before proceeding to the edit page.
      await page.getByRole("link", { name: "Edit" }).click();
      // The progress track is unique to the edit page (not the view page).
      // The aria-label on the <ol> lets us target it without CSS class selectors.
      await expect(
        page.getByRole("list", { name: "Team setup steps" }),
      ).toBeVisible();
    },

    async goToSchedule() {
      await navBar.getByRole("link", { name: "Schedule" }).click();
      await expect(
        page.getByRole("link", { name: "Export Calendar" }),
      ).toBeVisible();
    },

    async goToScheduleManager() {
      await navBar.getByRole("button", { name: "Admin" }).click();
      await page.getByRole("link", { name: "Schedule Manager" }).click();
      await expect(
        page.getByRole("heading", { name: "Season Management", level: 1 }),
      ).toBeVisible();
    },

    async goToGame(homeTeamName, awayTeamName, expectedButton) {
      await navBar.getByRole("link", { name: "Schedule" }).click();
      await expect(
        page.getByRole("link", { name: "Export Calendar" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Filters" }).click();
      await page.getByRole("radio", { name: "List" }).click();
      await expect(page.getByRole("radio", { name: "List" })).toBeChecked();
      await page.keyboard.press("Escape");

      const scheduleRow = page
        .getByRole("row")
        .filter({ has: page.getByText(homeTeamName) })
        .filter({ has: page.getByText(awayTeamName) });

      await scheduleRow.getByRole("link").click();

      if (expectedButton) {
        await expect(
          page.getByRole("button", { name: expectedButton, exact: false }),
        ).toBeVisible();
      }
    },

    async createLeague(leagueName) {
      await page.goto("/create-league");
      await page.getByLabel("League Name").fill(leagueName);
      await page.getByRole("button", { name: "Create League" }).click();
      // Form submit is async (authClient call + client-side navigate). Wait for
      // the URL to become "/" — that's what the form does on success, and it's
      // faster than waiting for the full home loader to paint a heading.
      await page.waitForURL("/", { timeout: 15_000 });
      // Fetch the active league id from the session without touching the DB.
      const session = await page.evaluate(async () => {
        const res = await fetch("/api/auth/get-session");
        return res.ok
          ? (res.json() as Promise<{
              session: { activeOrganizationId: string };
            }>)
          : null;
      });
      if (!session?.session.activeOrganizationId) {
        throw new Error(
          `createLeague: could not retrieve league id for "${leagueName}"`,
        );
      }
      return { leagueId: session.session.activeOrganizationId };
    },
  });
}

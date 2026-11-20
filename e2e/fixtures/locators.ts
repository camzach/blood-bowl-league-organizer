import type { Page } from "@playwright/test";

export const playerRow = (page: Page, number: number) =>
  page.getByRole("row").filter({
    has: page.getByRole("cell", { name: String(number), exact: true }),
  });

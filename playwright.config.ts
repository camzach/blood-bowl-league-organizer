import { config } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

// E2E runs against a dev server you start yourself (`pnpm dev --mode test`).
// BASE_URL is set before dotenv runs so it takes precedence over the value in
// .env.test (override: false), and is inherited by the worker processes.
const port = 5173;
const baseURL = `http://localhost:${port}`;
process.env.BASE_URL = baseURL;

config({ path: ".env.test", override: false });

export default defineConfig({
  testDir: "./e2e/tests",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 4,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], timezoneId: "UTC" },
    },
  ],
});

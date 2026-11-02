import { defineConfig, devices } from "@playwright/test";

/**
 * Runs against a live stack: website on :3000 and API on :4000 with a seeded database (demo data on).
 * Start them with `docker compose up` or `pnpm dev`, then `pnpm test:e2e`.
 * Set E2E_START_SERVERS=1 to let Playwright start the built apps itself (used in CI).
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./specs",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: process.env.E2E_START_SERVERS
    ? [
        { command: "node ../../apps/api/dist/main.js", url: "http://localhost:4000/api/v1/health", reuseExistingServer: true, timeout: 60_000 },
        { command: "node ../../node_modules/next/dist/bin/next start ../../apps/web --port 3000", url: baseURL, reuseExistingServer: true, timeout: 90_000 },
      ]
    : undefined,
});

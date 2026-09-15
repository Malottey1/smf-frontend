import { defineConfig, devices } from "@playwright/test";

/**
 * Specs are named by FR ID (e2e/FR-SMF-NN.spec.ts) on purpose — each file's
 * pass/fail becomes a line in the eventual traceability matrix mapping
 * straight back to the URS acceptance criteria it exercises. A skipped
 * spec (FR-SMF-07) means "not built yet," not "not tested."
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  timeout: 45_000,
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

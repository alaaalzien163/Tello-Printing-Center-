import { defineConfig, devices } from "@playwright/test";

// Load local Playwright credentials without logging or overriding real
// environment variables. Real values stay in the gitignored .env.local.
try {
  process.loadEnvFile(".env.local");
} catch {
  // The file is optional; credential-dependent tests skip when it is absent.
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    locale: "en-US",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- -p 3000",
        url: `${baseURL}/en`,
        reuseExistingServer: true,
        timeout: 180_000,
      },
});

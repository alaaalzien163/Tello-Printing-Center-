import { defineConfig, devices } from "@playwright/test";

// E2E must never inherit Production credentials from `.env.local`. Only the
// dedicated, gitignored `.env.test.local` file is loaded here. Next.js loads
// `.env.local` on its own, so the variables below are forwarded explicitly to
// the dev server to make it target the same Staging project the guard checks.
try {
  process.loadEnvFile(".env.test.local");
} catch {
  // The file is optional; write tests skip until Staging is configured.
}

const TEST_PROJECT_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "PRINT_REQUEST_RATE_LIMIT_SECRET",
] as const;

const testProjectEnv: Record<string, string> = {};
for (const key of TEST_PROJECT_ENV_KEYS) {
  const value = process.env[key]?.trim();
  if (value) testProjectEnv[key] = value;
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
        env: {
          ...testProjectEnv,
        },
      },
});

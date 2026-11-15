import { expect, type Page } from "@playwright/test";

import ar from "../../messages/ar.json";
import en from "../../messages/en.json";

export interface E2ECredentials {
  email: string;
  password: string;
}

function readCredentials(
  email: string | undefined,
  password: string | undefined,
): E2ECredentials | null {
  return email && password ? { email, password } : null;
}

export const adminCredentials = readCredentials(
  process.env.E2E_ADMIN_EMAIL,
  process.env.E2E_ADMIN_PASSWORD,
);

export const nonAdminCredentials = readCredentials(
  process.env.E2E_NON_ADMIN_EMAIL,
  process.env.E2E_NON_ADMIN_PASSWORD,
);

export const adminCredentialsMissing =
  "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD in .env.local to run authenticated tests.";

export const nonAdminCredentialsMissing =
  "Set E2E_NON_ADMIN_EMAIL and E2E_NON_ADMIN_PASSWORD in .env.local to run the non-admin test.";

export async function waitForAdminLoginHydration(
  page: Page,
  locale: "en" | "ar" = "en",
): Promise<void> {
  const messages = locale === "ar" ? ar : en;
  const password = page.getByLabel(messages.admin.login.password, { exact: true });

  // The password visibility toggle is a client-only control, so a successful
  // round-trip proves React has hydrated and subsequent form events are safe.
  await expect(async () => {
    if ((await password.getAttribute("type")) === "text") return;

    await page.getByRole("button", { name: messages.admin.login.showPassword }).click();
    await expect(password).toHaveAttribute("type", "text", { timeout: 1_000 });

    await page.getByRole("button", { name: messages.admin.login.hidePassword }).click();
    await expect(password).toHaveAttribute("type", "password", { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}

export async function signIn(page: Page, locale: "en" | "ar" = "en"): Promise<void> {
  if (!adminCredentials) throw new Error(adminCredentialsMissing);

  const messages = locale === "ar" ? ar : en;

  await page.goto(`/${locale}/admin`);
  await expect(page).toHaveURL(new RegExp(`/${locale}/admin/login`));
  await waitForAdminLoginHydration(page, locale);

  await page.getByLabel(messages.admin.login.email).fill(adminCredentials.email);
  await page
    .getByLabel(messages.admin.login.password, { exact: true })
    .fill(adminCredentials.password);
  await page.getByRole("button", { name: messages.admin.login.signIn }).click();

  await expect(page).toHaveURL(new RegExp(`/${locale}/admin$`));
  await expect(page.getByRole("heading", { name: messages.admin.overview.title }).first()).toBeVisible();
}

export async function goToAdminPage(page: Page, path: string): Promise<void> {
  await page.goto(`/en/admin/${path}`);
  await expect(page).toHaveURL(new RegExp(`/en/admin/${path}$`));
}

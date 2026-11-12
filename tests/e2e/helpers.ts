import { expect, type Page } from "@playwright/test";

import en from "../../messages/en.json";

export async function signIn(page: Page): Promise<void> {
  await page.goto("/en/admin");
  await expect(page).toHaveURL(/\/en\/admin\/login/);

  await page.getByLabel(en.admin.login.email).fill("demo.admin@tello.example");
  await page.getByLabel(en.admin.login.password, { exact: true }).fill("password123");
  await page.getByRole("button", { name: en.admin.login.signIn }).click();

  await expect(page).toHaveURL(/\/en\/admin$/);
  await expect(page.getByRole("heading", { name: en.admin.overview.title }).first()).toBeVisible();
}

export async function goToAdminPage(page: Page, path: string): Promise<void> {
  await page.goto(`/en/admin/${path}`);
  await expect(page).toHaveURL(new RegExp(`/en/admin/${path}$`));
}

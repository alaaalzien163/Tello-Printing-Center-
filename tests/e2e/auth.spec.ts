import { expect, test } from "@playwright/test";

import ar from "../../messages/ar.json";
import en from "../../messages/en.json";

import {
  adminCredentials,
  adminCredentialsMissing,
  nonAdminCredentials,
  nonAdminCredentialsMissing,
  signIn,
  waitForAdminLoginHydration,
} from "./helpers";
import { assertAppTargetsStaging, e2eWriteGuard } from "./staging";

test.describe("admin authentication", () => {
  test("redirects unauthenticated visitors to the localized login page", async ({ page }) => {
    await page.goto("/en/admin");
    await expect(page).toHaveURL(/\/en\/admin\/login$/);
    await expect(page.getByRole("heading", { name: en.admin.login.title })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

    await page.goto("/ar/admin/products");
    await expect(page).toHaveURL(/\/ar\/admin\/login$/);
    await expect(page.getByRole("heading", { name: ar.admin.login.title })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  test("validates the form and rejects invalid credentials", async ({ page }) => {
    await page.goto("/en/admin/login");
    await waitForAdminLoginHydration(page);
    const form = page.getByRole("form", { name: en.admin.login.title });

    await page.getByRole("button", { name: en.admin.login.signIn }).click();
    await expect(page.getByText(en.validation.emailRequired)).toBeVisible();
    await expect(page.getByText(en.validation.passwordRequired)).toBeVisible();

    await page.getByLabel(en.admin.login.email).fill(`unknown-${Date.now()}@example.com`);
    await page
      .getByLabel(en.admin.login.password, { exact: true })
      .fill("wrong-password-123");
    await page.getByRole("button", { name: en.admin.login.signIn }).click();

    await expect(form.getByRole("alert")).toHaveText(en.admin.login.invalidCredentials);
    await expect(page).toHaveURL(/\/en\/admin\/login$/);
  });

  test("toggles password visibility", async ({ page }) => {
    await page.goto("/en/admin/login");
    await waitForAdminLoginHydration(page);

    const password = page.getByLabel(en.admin.login.password, { exact: true });

    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: en.admin.login.showPassword }).click();
    await expect(password).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: en.admin.login.hidePassword }).click();
    await expect(password).toHaveAttribute("type", "password");
  });

  test("signs in an authorized admin and persists the session", async ({ page }) => {
    test.skip(!adminCredentials, adminCredentialsMissing);

    await signIn(page);
    await expect(page.getByText(en.admin.common.demoBadge).first()).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL(/\/en\/admin$/);
    await expect(
      page.getByRole("heading", { name: en.admin.overview.title }).first(),
    ).toBeVisible();

    await page.goto("/en/admin/products");
    await expect(page).toHaveURL(/\/en\/admin\/products$/);
    await expect(
      page.getByRole("heading", { name: en.admin.products.title }).first(),
    ).toBeVisible();
  });

  test("denies an authenticated non-admin account", async ({ page }) => {
    test.skip(!e2eWriteGuard.allowed, e2eWriteGuard.reason);
    test.skip(!nonAdminCredentials, nonAdminCredentialsMissing);
    await assertAppTargetsStaging(page.request);

    await page.goto("/en/admin/login");
    await waitForAdminLoginHydration(page);
    const form = page.getByRole("form", { name: en.admin.login.title });
    await page.getByLabel(en.admin.login.email).fill(nonAdminCredentials!.email);
    await page
      .getByLabel(en.admin.login.password, { exact: true })
      .fill(nonAdminCredentials!.password);
    await page.getByRole("button", { name: en.admin.login.signIn }).click();

    await expect(form.getByRole("alert")).toHaveText(en.admin.login.notAuthorized);
    await expect(page).toHaveURL(/\/en\/admin\/login$/);

    await page.goto("/en/admin");
    await expect(page).toHaveURL(/\/en\/admin\/login/);
  });

  test("logs out and revokes dashboard access", async ({ page }) => {
    test.skip(!adminCredentials, adminCredentialsMissing);

    await signIn(page);
    await page.getByRole("button", { name: en.admin.common.logout }).first().click();

    await expect(page).toHaveURL(/\/en\/admin\/login$/);
    await page.goto("/en/admin");
    await expect(page).toHaveURL(/\/en\/admin\/login$/);
  });

  test("renders the login in English and Arabic with correct direction", async ({ page }) => {
    await page.goto("/en/admin/login");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.getByRole("heading", { name: en.admin.login.title })).toBeVisible();
    await expect(page.getByLabel(en.admin.login.email)).toBeVisible();

    await page.goto("/ar/admin/login");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: ar.admin.login.title })).toBeVisible();
    await expect(page.getByLabel(ar.admin.login.email)).toBeVisible();

    await waitForAdminLoginHydration(page, "ar");
    await page.getByRole("button", { name: ar.admin.login.signIn }).click();
    await expect(page.getByText(ar.validation.emailRequired)).toBeVisible();
    await expect(page.getByText(ar.validation.passwordRequired)).toBeVisible();
  });

  test("shows the Arabic invalid-credentials message", async ({ page }) => {
    await page.goto("/ar/admin/login");
    await waitForAdminLoginHydration(page, "ar");
    const form = page.getByRole("form", { name: ar.admin.login.title });

    await page.getByLabel(ar.admin.login.email).fill(`unknown-${Date.now()}@example.com`);
    await page
      .getByLabel(ar.admin.login.password, { exact: true })
      .fill("wrong-password-123");
    await page.getByRole("button", { name: ar.admin.login.signIn }).click();

    await expect(form.getByRole("alert")).toHaveText(ar.admin.login.invalidCredentials);
  });

  test("supports light and dark themes on the login page", async ({ page }) => {
    await page.goto("/en/admin/login");
    await waitForAdminLoginHydration(page);

    await page.getByRole("button", { name: en.theme.toggle }).first().click();
    await page.getByRole("menuitemradio", { name: en.theme.dark }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByRole("heading", { name: en.admin.login.title })).toBeVisible();

    await page.getByRole("button", { name: en.theme.toggle }).first().click();
    await page.getByRole("menuitemradio", { name: en.theme.light }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expect(page.getByRole("heading", { name: en.admin.login.title })).toBeVisible();
  });

  test("does not expose a public signup form", async ({ page }) => {
    await page.goto("/en/admin/signup");
    await expect(page.getByRole("button", { name: en.admin.login.signIn })).toBeVisible();
    await expect(page.getByRole("button", { name: /sign up/i })).toHaveCount(0);
  });
});
